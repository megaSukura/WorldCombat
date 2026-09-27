/**
 * 自我激励 / workup 的执行组织。
 *
 * 核心念头：给自己鼓一口气。猛地一攥拳，火气从心里窜到身上，攻击与特攻一起抬起来；被压制到一定地步时，
 * 更好的那一项会多涨一级——它读的是「现在有多惨」，所以越被压着越拧。
 *
 * 一幕半：
 *   起（windup 播「聚气」，提交前只观察与预告，可被打断，打断不花代价）。
 *   抬（提交后）：NativeEffects.boost 同时抬起物攻与特攻（宝可梦走原生等级，其他战斗者落到攻击属性），
 *     挂上共享身份 world_combat:status/roused 的「斗志」标记（可见窗口），并播放一次火光爆发；
 *     若这一次触发了受伤加成，换成更大的背水爆发与「背水一战」浮字。
 *
 * 与同族分开：生长是慢的、吃太阳、会让身体与地面一起长大；自我激励是快的、吃自己的伤、随手就能补一口。
 */
namespace PokemonSkills {
    const workupScene = "world_combat:move_workup";
    const workupRoused = "world_combat:roused";
    const workupText = "world_combat.move.workup.text.roused";
    const workupBackText = "world_combat.move.workup.text.backfoot";
    /** 续期节奏与单次时长：余火随标记存在，标记被驱散后最多再飘这么久。 */
    const workupAuraRefresh = 40;
    const workupAuraTicks = 60;

    /** 本招的火星量（物攻 + 特攻派生），作为第二份常数由公式现场求值。 */
    function workupSurge(world: CombatWorld, actor: CombatActor): number {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(actor), skill: skills["workup"], detail: { values: {} }, world, actor };
        return Math.max(16, Math.min(64, Math.round(p("workup", "surge", context))));
    }

    define({
        id: "workup",
        cooldownParameter: "wait",
        name: "Work Up",
        description: "给自己鼓一口气，把攻击与特攻一起抬起来。生命越低，这股火越旺——你更擅长的那一项会多涨一级；起手极短、冷却很短，可以在连打之间随手补上。",
        uses: ["开场先给自己鼓一口气", "被压制时反手把火气拧起来", "在连打之间随手补一层双攻"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 7,
        active: 1,
        recover: 5,
        cooldown: 34,
        style: "resolve",
        defaults: { desperate: false },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["workup"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("workup", "tempo", context)),
                recover: Math.round(p("workup", "aftercast", context)),
                cooldown: Math.round(p("workup", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_workup:gather", workupScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", desperate: config && config.desperate ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor();
            const atk = Math.max(1, Math.min(2, Math.round(p("workup", "atkGift", action))));
            const spa = Math.max(1, Math.min(2, Math.round(p("workup", "spaGift", action))));
            const surge = workupSurge(world, actor);
            const window = Math.max(80, Math.round(p("workup", "rousedTicks", action)));
            // 以实际落下的等级为准：某一项已到顶时不再虚报收益，文本与回执都按真实变化。
            const atkGain = Math.max(0, NativeEffects.boost(world, actor, "atk", atk));
            const spaGain = Math.max(0, NativeEffects.boost(world, actor, "spa", spa));
            const mark = MobEffects.apply(world, actor, workupRoused, window, 0);
            // 只要有一项真的多涨了一级，就是背水式触发。
            const comeback = atkGain + spaGain > 2;
            const body = world.observe(actor);
            if (body !== null) {
                WorldFeedback.emit(world, workupScene, 1, body.position(),
                    { moment: comeback ? "backfoot" : "flare", actor: String(actor.ref()), atk: atkGain, spa: spaGain,
                        gift: atkGain + spaGain, surge: surge, comeback: comeback ? 1 : 0,
                        intensity: Math.max(0.8, Math.min(2, (atkGain + spaGain) / 2 || 0.8)) }, comeback ? 32 : 26);
                // 余火跟着「斗志」标记一起走：标记还在就由它的 tick 续期，标记被驱散后自然收尾。
                if (mark !== null) WorldFeedback.keep(world, "workup:aura:" + String(actor.ref()), workupScene, 1, body.position(),
                    { moment: "resolve", actor: String(actor.ref()), surge: surge }, workupAuraTicks);
                if (atkGain + spaGain > 0) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)),
                    comeback ? workupBackText : workupText, [atkGain, spaGain], 34);
                world.sound(comeback ? "minecraft:entity.player.levelup" : "minecraft:block.note_block.basedrum",
                    body.position(), 16, "{}");
            }
            done(action);
        }
    });

    // 「斗志」还在时按自己的节奏续期余火，与标记同寿；标记消失后不再续期。
    WorldCombat.on("world_combat:move_workup/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== workupRoused) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon" || world.tick() % workupAuraRefresh !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "workup:aura:" + String(actor.ref()), workupScene, 1, body.position(),
            { moment: "resolve", actor: String(actor.ref()), surge: workupSurge(world, actor) }, workupAuraTicks);
    });
}
