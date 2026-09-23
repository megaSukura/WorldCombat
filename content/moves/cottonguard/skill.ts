/**
 * 棉花防守 / cottonguard — 执行组织。
 *
 * 核心念头：一层层白绒从身上鼓出来，把自己裹成一团。越裹越厚，硬得像撞进一堵棉花墙；
 *   可裹厚了也迈不开步——绒毛护住你，也拖住你。
 *
 * 两幕：
 *   鼓（windup 播「鼓绒」，提交前只观察与预告，打断不花代价）。
 *   裹（提交后）：NativeEffects.boost(def, gift) 写入公共能力阶梯，挂上共享身份
 *     world_combat:status/cottonguard 的「绒衣」窗口；厚裹时另挂一层独立的移速减益（裹厚了迈不开步）。
 * 结束：绒衣被撕光、到期或被清除时，这段防护抬起的等级原样收回——对手有一次磨掉它的反制。
 */
namespace PokemonSkills {
    const cottonGuardScene = "world_combat:move_cottonguard";
    const cottonGuardCoat = "world_combat:cotton_coat";
    const cottonGuardSlow = "world_combat:cotton_slow";
    const cottonGuardText = "world_combat.move.cottonguard.text.fluffed";
    const cottonGuardBareText = "world_combat.move.cottonguard.text.bare";
    /** 表现里的参考半径：`data.scale = 实际鼓开半径 / 这个数`，让绒环与判定同半径。 */
    const cottonGuardReferenceRadius = 1.5;

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function cottonGuardStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function cottonGuardRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = cottonGuardStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, cottonGuardStage(world, actor, stat) - before);
    }

    define({
        id: "cottonguard",
        cooldownParameter: "wait",
        name: "棉花防守",
        description: "用软绵绵的绒毛裹住自己的身体进行守护，巨幅提高自己的防御。",
        uses: ["硬吃一轮爆发前先裹上绒衣", "在近身肉搏里把防御堆起来", "用可见的绒衣窗口逼对手先花时间磨它"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 110,
        style: "cocoon",
        stationary: true,
        defaults: { cocoon: 1, ai: { maxChase: 12, panic: 0.6 } },
        fields: [
            field(pathOf("cocoon"), "绒层", "choice", {
                options: [
                    { value: 0, label: "轻裹" },
                    { value: 1, label: "厚裹" }
                ],
                help: "厚裹：防御 +3 级、绒衣更久，但期间移动速度下降、起手与冷却更长；轻裹：防御 +2 级、不拖慢移动、更快。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: p("cottonguard", "bloom", pokemon), geometry: "area", style: "cocoon", color: 0xF6F3EA,
                label: config && Number(config.cocoon) === 1 ? "棉花防守 · 厚裹" : "棉花防守 · 轻裹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["cottonguard"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("cottonguard", "tempo", context)),
                recover: Math.round(p("cottonguard", "aftercast", context)),
                cooldown: Math.round(p("cottonguard", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_cottonguard:bloom", cottonGuardScene, 1, action.origin(),
                JSON.stringify({ moment: "bloom", heavy: config && Number(config.cocoon) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const heavy = !!(config && Number(config.cocoon) === 1);
            const gift = Math.max(2, Math.min(3, Math.round(p("cottonguard", "gift", action))));
            const bloom = Math.max(0.9, p("cottonguard", "bloom", action));
            const window = Math.max(120, Math.round(p("cottonguard", "coatTicks", action)));
            const fluff = Math.max(16, Math.round(p("cottonguard", "fluff", action)));
            const layers = Math.max(3, Math.min(6, Math.round(p("cottonguard", "layers", action))));
            const scale = bloom / cottonGuardReferenceRadius;
            const levels = cottonGuardRaise(world, actor, "def", gift);
            MobEffects.apply(world, actor, cottonGuardCoat, window, levels);
            if (heavy) MobEffects.apply(world, actor, cottonGuardSlow, window, 0);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, cottonGuardScene, 1, feet,
                { moment: "wrap", actor: String(actor.ref()), gift: levels, bloom: bloom, fluff: fluff, layers: layers,
                    scale: scale, heavy: heavy ? 1 : 0, intensity: Math.max(0.8, Math.min(2, levels / 2 + layers * 0.1)) }, 34);
            WorldFeedback.keep(world, "cottonguard:coat:" + String(actor.ref()), cottonGuardScene, 1, body.position(),
                { moment: "coat", actor: String(actor.ref()), layers: layers, scale: scale, heavy: heavy ? 1 : 0 }, Math.min(window, 240));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), cottonGuardText, [levels, layers], 32);
            world.sound("cobblemon:move.cottonguard.actor", body.position(), 16, "{}");
            done(action);
        }
    });

    // 绒衣被撕光、到期或被清除：把这段防护抬起的等级原样收回，只收到当前实际持有的正等级，避免抹掉别处的增益。
    WorldCombat.on("world_combat:move_cottonguard/bare", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== cottonGuardCoat) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        const loss = Math.min(levels, Math.max(0, cottonGuardStage(world, actor, "def")));
        if (loss > 0) NativeEffects.boost(world, actor, "def", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, cottonGuardScene, 1, body.position(), { moment: "bare", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), cottonGuardBareText, [], 24);
    });
}
