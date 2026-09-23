/**
 * 奇异之光 / confuseray — 执行组织。
 *
 * 核心念头：放出一束幽光，笔直地照进目标的眼里；被照到的人从此分不清真假，出手会打偏、
 * 用力会伤到自己。光是一条直线，掩体与走位都能让它落空。
 *
 * 出手：短起手（windup 播汇聚预告）后提交。提交前只看不碰世界。
 * 命中：提交后用 action.trace 沿直线做权威判定；命中活体即挂共享身份 world_combat:status/confusion
 *       的 world_combat:confuseray_mist（物品栏可见、/effect 可用）。宝可梦不再额外写原生异常，
 *       混乱由本单元的行为承担。
 * 持续：混乱存续期由该 MobEffect 承担，周期性 keep 播放头顶飞鸟。
 * 随机分支：目标每次试图出手（world_combat:before_commit）按载体振幅掷骰；中则本次出手作废。
 * 反噬：目标每次打中非友方（world_combat:damage_applied）按自身攻击结算自伤。
 * 反制：光束是直线、有距离上限；掩体、走位和贴脸都能让它落空。已有混乱的目标只被刷新，不叠加。
 */
namespace PokemonSkills {
    function confuserayAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 本招自己的混乱载体：只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function confuserayCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === confuserayEffect ? effect : null;
    }

    define({
        id: confuserayId,
        cooldownParameter: "recharge",
        name: "奇异之光",
        description: "显示奇怪的光，扰乱对手，使对手混乱。",
        uses: ["远程单体扰乱", "让高输出敌人打空", "在安全距离打断远程压制"],
        kind: "enemy",
        range: 30,
        maxRange: 30,
        prepare: 16,
        active: 1,
        recover: 6,
        cooldown: 70,
        style: "ghost",
        defaults: { beam: "wide" },
        fields: [
            choice("beam", "光束形态", ["wide", "focus"], ["广照", "凝神"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[confuserayId], detail: { values: config }, world, actor, attributes };
            const focus = config.beam === "focus";
            const reach = Math.max(8, Math.min(30, p(confuserayId, "beamReach", context) * (focus ? 0.75 : 1.25)));
            return {
                prepare: Math.round(p(confuserayId, "tempo", context)) + (focus ? 4 : 0),
                recover: Math.round(p(confuserayId, "aftercast", context)),
                cooldown: Math.round(p(confuserayId, "recharge", context) * (focus ? 1.15 : 1)),
                range: reach,
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_confuseray:windup", confuserayScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function () { return { radius: 0.9, geometry: "point", style: "ghost", color: 0x8A5CFF, label: "奇异之光" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), origin = action.origin(), target = action.target();
            const targetPos = action.targetPosition();
            const delta = targetPos.minus(origin);
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const reach = Math.max(0.5, Math.min(action.range(), delta.length() || action.range()));
            const radius = p(confuserayId, "beamRadius", action);
            const motes = Math.max(1, Math.round(p(confuserayId, "motes", action)));
            const ticks = Math.max(20, Math.round(p(confuserayId, "mistTicks", action)));
            const chance = Math.max(0.05, Math.min(0.9, confuserayBaseChance));
            sound(action, "minecraft:entity.illusioner.cast_spell");
            WorldFeedback.emit(world, confuserayScene, 1, origin,
                { moment: "beam", reach: reach, motes: motes, radius: radius,
                    direction: [direction.x(), direction.y(), direction.z()],
                    target: target === null ? "" : String(target.ref()) }, 26);
            const hit = action.trace(origin, targetPos, radius);
            const landed = hit.hitEntity() ? hit.target() : null;
            if (landed !== null && String(landed.key()) !== String(action.actor().key()) && !world.friendly(landed)) {
                const landedTicks = ticks;
                CombatStatus.apply(world, landed, "confusion", confuserayEffect, landedTicks, Math.round(chance * 100), { unique: true });
                const body = world.observe(landed);
                const at = body === null ? targetPos : body.position();
                WorldFeedback.emit(world, confuserayScene, 1, at,
                    { moment: "main", target: String(landed.ref()), motes: motes, scale: Math.max(0.6, Math.min(2, landedTicks / 180)) }, 42);
                WorldFeedback.text(world, confuserayAbove(at), "world_combat.move.confuseray.text.confused", [Math.round(landedTicks / 20)], 44);
                sound(action, "cobblemon:status.volatile.confusion.actor");
            }
            done(action);
        }
    });


    // 反噬：被晃晕的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_confuseray/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (confuserayCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = confuserayRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        const above = confuserayAbove(body.position());
        WorldFeedback.emit(world, confuserayScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, above, "world_combat.move.confuseray.text.recoil", [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 混乱存续期：飞鸟在目标头顶绕，低密度、每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_confuseray/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== confuserayEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "confuseray:" + String(actor.ref()), confuserayScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
