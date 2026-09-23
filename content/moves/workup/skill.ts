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

    define({
        id: "workup",
        cooldownParameter: "wait",
        name: "Work Up",
        description: "激励自己，从而提高攻击和特攻。",
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
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const atk = Math.max(1, Math.min(2, Math.round(p("workup", "atkGift", action))));
            const spa = Math.max(1, Math.min(2, Math.round(p("workup", "spaGift", action))));
            const surge = Math.max(16, Math.round(p("workup", "surge", action)));
            const window = Math.max(80, Math.round(p("workup", "rousedTicks", action)));
            // 只要有一项多涨了一级，就是背水式触发。
            const comeback = atk + spa > 2;
            NativeEffects.boost(world, actor, "atk", atk);
            NativeEffects.boost(world, actor, "spa", spa);
            MobEffects.apply(world, actor, workupRoused, window, 0);
            const body = world.observe(actor);
            if (body !== null) {
                WorldFeedback.emit(world, workupScene, 1, body.position(),
                    { moment: comeback ? "backfoot" : "flare", actor: String(actor.ref()), atk: atk, spa: spa,
                        gift: atk + spa, surge: surge, comeback: comeback ? 1 : 0,
                        intensity: Math.max(0.8, Math.min(2, (atk + spa) / 2)) }, comeback ? 32 : 26);
                WorldFeedback.keep(world, "workup:aura:" + String(actor.ref()), workupScene, 1, body.position(),
                    { moment: "resolve", actor: String(actor.ref()), surge: surge }, Math.min(window, 120));
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)),
                    comeback ? workupBackText : workupText, [atk, spa], 34);
                world.sound(comeback ? "minecraft:entity.player.levelup" : "minecraft:block.note_block.basedrum",
                    body.position(), 16, "{}");
            }
            done(action);
        }
    });
}
