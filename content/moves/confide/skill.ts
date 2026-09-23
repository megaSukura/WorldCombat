/**
 * 密语 / Confide — 执行组织。
 *
 * 核心念头：凑到对手耳边说一个秘密，把「集中力」从它手里拿走。秘密是声音，沿直线钻进耳朵，
 *   墙和掩体都挡不住；所以它不需要通视，也不需要瞄准——代价是只认听得见的距离，而且降得少。
 *
 * 出手：短起手（windup 在喉间聚起低语）后提交；声音本身不飞、不铺地。
 * 命中：目标挂共享的 world_combat:confided_whisper（身份 world_combat:status/confided），
 *       再 NativeEffects.boost 下降特攻；宝可梦损失原生特攻等级，其他生物落到攻击属性。
 * 传谣：同一句话扩散到目标 rumorRadius 内的其他非友方，各自再浅一些，总数受 maxListeners 限制；
 *       声音同样不需要通视，但必须有人站在目标身边才值得。
 * 反制：拉开到 whisperRange 之外就听不见；降幅很小，不足以扭转正面对拼。
 */
namespace PokemonSkills {
    function confideAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 把秘密告诉一个听得见的人：挂身份、扣特攻、播命中表现与浮字。 */
    function confideWhisper(world: CombatWorld, target: CombatActor, drop: number, focus: number, whispers: number): void {
        MobEffects.apply(world, target, confideEffect, focus, 0);
        NativeEffects.boost(world, target, "spa", -drop);
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, confideScene, 1, body.position(),
            { moment: "leak", target: String(target.ref()), path: ["source", "target"],
                drop: drop, whispers: whispers }, 30);
        WorldFeedback.text(world, confideAbove(body.position()), "world_combat.move.confide.text.whisper", [drop], 40);
    }

    define({
        id: confideId,
        cooldownParameter: "recharge",
        name: "密语",
        description: "凑到对手耳边说个秘密，让它失去集中力，降低它的特攻。密语是声音，能绕过掩体，但只在听得见的距离内生效；也可以把它当成闲话传出去，让目标周围的人一起分心。",
        uses: ["隔着掩体削弱法系威胁", "打断需要蓄力维持的特攻威胁", "趁敌人扎堆时一句闲话带走几个"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 140,
        style: "whisper",
        defaults: { rumor: false },
        fields: [
            flag("rumor", "传谣")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[confideId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(confideId, "tempo", context)),
                recover: p(confideId, "recover", context),
                cooldown: Math.round(p(confideId, "recharge", context)),
                active: 1,
                range: p(confideId, "whisperRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("confide-windup", confideScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", rumor: config && config.rumor ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const rumor = !!(config && config.rumor);
            return { radius: rumor ? 7 : 6, geometry: "line", style: "whisper", color: 0x8A7BD8,
                label: rumor ? "密语·传谣" : "密语" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const drop = Math.max(1, Math.min(2, Math.round(p(confideId, "drop", action))));
            const focus = Math.max(60, Math.round(p(confideId, "focusTicks", action)));
            const whispers = Math.max(6, Math.round(p(confideId, "whispers", action)));
            const rumor = !!(config && config.rumor);
            sound(action, "minecraft:entity.villager.ambient");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, confideScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            // 声音不需要通视：掩体挡不住密语，这正是它不用瞄准的价值。
            confideWhisper(world, target, drop, focus, whispers);
            if (rumor) {
                const at = world.observe(target);
                const centre = at === null ? action.targetPosition() : at.position();
                const radius = Math.max(1.2, p(confideId, "rumorRadius", action));
                const cap = Math.max(1, Math.round(p(confideId, "maxListeners", action)));
                let caught = 1;
                WorldGeometry.select(world, WorldGeometry.ring(centre, 0, radius), function (actor, facts) {
                    if (caught >= cap || facts.friendly() || String(actor.ref()) === String(target.ref())) return;
                    confideWhisper(world, actor, drop, focus, whispers);
                    caught++;
                });
                WorldFeedback.emit(world, confideScene, 1, centre,
                    { moment: "rumor", radius: radius, caught: caught, drop: drop,
                        whispers: Math.round(whispers * (1 + (caught - 1) * 0.6)), scale: radius / 2.0 }, 32);
                if (caught > 1)
                    WorldFeedback.text(world, confideAbove(centre), "world_combat.move.confide.text.rumor", [caught - 1], 40);
            }
            done(action);
        }
    });

    // 失神期间，目标头顶持续浮起零碎的低语点。
    WorldCombat.on("world_combat:move_confide/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== confideEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 8 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "confide:" + String(actor.ref()), confideScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
