/**
 * 装饰 / decorate 的执行组织。
 *
 * 核心念头：这件作品不是给自己戴的，是送给队友的。当场搓出一束奶油与缎带，让它们飞向**另一个**友方，
 * 把他装扮成队伍里最锋利的那件作品——物攻与特攻一起大幅抬起来，装饰物在他身上亮一阵子。
 *
 * 两幕：
 *   起（windup 播「搓装饰」，提交前只观察与预告，可被打断，打断不花代价）。
 *   送（提交后）：一束装饰沿施法者到目标的连线飞过去（表现用同一组顶点画 polyline），在目标身上炸开并挂上，
 *     同时 NativeEffects.boost 把目标的物攻与特攻各抬起 `gift` 级，并挂上共享身份
 *     world_combat:status/decorated 的「已装扮」标记；装饰物在身上持续闪到标记结束。
 *
 * 只送给别人：`ready` 拒绝以自己为目标——这件作品要有一个佩戴者。
 * 与同族分开：其余三招都只碰自己或只做减法；装饰把力量送到另一个战斗者身上，是这一组里唯一的「给」。
 */
namespace PokemonSkills {
    const decorateScene = "world_combat:move_decorate";
    const decorateMark = "world_combat:decorated";
    const decorateText = "world_combat.move.decorate.text.adorned";

    define({
        id: "decorate",
        cooldownParameter: "wait",
        name: "Decorate",
        description: "通过装饰，大幅提高对方的攻击和特攻。",
        uses: ["开战前把身边的队友打扮成主力", "在队友冲上去之前先给他加满双攻", "把自己以外的伙伴变成一把更利的刀"],
        kind: "friend",
        range: 5,
        maxRange: 7,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 70,
        style: "ribbon",
        defaults: { thick: false },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["decorate"], detail: { values: config } };
            return { radius: p("decorate", "reach", context), geometry: "point", style: "ribbon", color: 0xFF9FC4, label: "装饰" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["decorate"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("decorate", "tempo", context)),
                recover: Math.round(p("decorate", "aftercast", context)),
                cooldown: Math.round(p("decorate", "wait", context)),
                active: 1,
                range: p("decorate", "reach", context)
            };
        },
        ready: function (action, config) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "no-self";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_decorate:gather", decorateScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", thick: config && config.thick ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const target = action.target();
            if (target === null || !world.valid(target) || !world.friendly(target)
                || String(target.ref()) === String(actor.ref())) { done(action); return; }
            const gift = Math.max(2, Math.min(3, Math.round(p("decorate", "gift", action))));
            const veneer = Math.max(60, Math.round(p("decorate", "veneer", action)));
            const trinkets = Math.max(6, Math.round(p("decorate", "trinkets", action)));
            NativeEffects.boost(world, target, "atk", gift);
            NativeEffects.boost(world, target, "spa", gift);
            MobEffects.apply(world, target, decorateMark, veneer, 0);
            const bearer = world.observe(target);
            if (bearer === null) { done(action); return; }
            const path: (string | number[])[] = [String(actor.ref()), String(target.ref())];
            WorldFeedback.emit(world, decorateScene, 1, bearer.position(),
                { moment: "stream", path: path, target: String(target.ref()), trinkets: trinkets, gift: gift,
                    scale: 1, intensity: Math.max(0.8, Math.min(2, gift / 2)) }, 26);
            WorldFeedback.emit(world, decorateScene, 1, bearer.position(),
                { moment: "adorn", target: String(target.ref()), trinkets: trinkets, gift: gift, scale: 1 }, 30);
            WorldFeedback.keep(world, "decorate:glint:" + String(target.ref()), decorateScene, 1, bearer.position(),
                { moment: "glint", target: String(target.ref()), trinkets: trinkets }, Math.min(veneer, 160));
            WorldFeedback.text(world, bearer.position().plus(WorldCombat.point(0, 1.4, 0)), decorateText, [gift], 34);
            world.sound("minecraft:block.amethyst_block.chime", bearer.position(), 16, "{}");
            done(action);
        }
    });
}
