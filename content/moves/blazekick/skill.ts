/**
 * 火焰踢 / blazekick 的出手方式。
 *
 * 核心念头：拧身而起，把裹火的腿沿一条上扬的弧线挑过去——把对手**踢得离地**，火顺着弧线舔上伤口。
 *   它是本族唯一把人挑起来的一招：命中的人被挑到空中一小段，在落地前动不了手；火则按概率留在身上。
 *
 * 两幕：
 *   起（windup，提交前）：身体拧起来、火从脚跟裹到脚尖，只播预告。
 *   踢（execute → kick / ignite / launch / miss）：提交后裹火的腿沿那道弧线向上挑，沿弧线分段做权威首碰；
 *       踢中最先碰到的非友方才结算 `kick` 接触伤害，按 `burnChance` 点燃（共享身份 world_combat:status/burn，
 *       宝可梦同步为原生灼伤），并尝试用原生击飞把目标挑离地面 `launch` 格——被抗性/事件拒绝就只保留伤害、
 *       不画升空轨迹。踢空、先碰到友方或撞墙都只留一道划过空气的火弧。
 *
 * 选取 kind: "aim"：可点敌人，也可只朝一个方向近身空踢；判定与画出的火弧共用同一个首碰落点。
 *
 * 与同族分开：火焰拳是直拳点火、火会蔓延到旁边的人；闪焰冲锋是整身撞过去、自己也受反震；
 *   火焰踢是单腿的上挑弧线，把人挑起来才是它的价值，代价是这一脚不重。
 *
 * 配置 ignite（烈焰式）由 resolve 改时序、由公式改威力/点燃/挑高，提交后才触碰世界。
 */
namespace PokemonSkills {
    const blazekickScene = "world_combat:move_blazekick";
    const blazekickHitText = "world_combat.move.blazekick.text.hit";
    const blazekickBurnText = "world_combat.move.blazekick.text.burn";
    const blazekickMissText = "world_combat.move.blazekick.text.miss";

    /** 裹火的腿划过的那道弧：从身后低位起，越过头顶，落到目标身上。 */
    function blazekickArc(origin: CombatPoint, heading: CombatPoint, reach: number, bulge: number, end: CombatPoint): number[][] {
        const behind = origin.plus(heading.scale(-0.4)).plus(WorldCombat.point(0, 0.2, 0));
        const under = origin.plus(WorldCombat.point(0, 0.9, 0));
        const apex = origin.plus(heading.scale(reach * 0.55)).plus(WorldCombat.point(0, reach * 0.4 + bulge, 0));
        const above = end.plus(WorldCombat.point(0, 0.5 + bulge * 0.4, 0));
        return [
            [behind.x(), behind.y(), behind.z()],
            [under.x(), under.y(), under.z()],
            [apex.x(), apex.y(), apex.z()],
            [above.x(), above.y(), above.z()],
            [end.x(), end.y(), end.z()]
        ];
    }

    /** 沿上扬弧线的分段做权威首碰判定：最先碰到的实体或方块就是这一脚挑中的地方；起点落在自身身上时跳过。 */
    function blazekickTrace(action: CombatAction, points: CombatPoint[], radius: number): CombatImpact | null {
        const self = String(action.actor().ref());
        for (let index = 1; index < points.length; index++) {
            const hit = action.trace(points[index - 1], points[index], radius, true);
            const inner = hit.hitEntity() ? hit.target() : null;
            if (inner !== null && String(inner.ref()) === self) continue;
            if (hit.hitEntity() || hit.blocked()) return hit;
        }
        return null;
    }

    define({
        id: "blazekick",
        cooldownParameter: "recharge",
        name: "Blaze Kick",
        description: "拧身而起，把裹火的腿沿一道上扬的弧线挑出去：可以点敌人，也可以只朝一个方向近身空踢。命中最先碰到的那个敌人造成接触伤害、按概率使目标灼伤（灼伤使其物理伤害减半并持续掉血）；能否把它挑离地面按原生击飞规则，被拒绝时只保留伤害、不画升空轨迹。烈焰式更容易点着、挑得更高；重踢式踢得更重但火难留。",
        uses: ["一记把目标挑离地面的上挑火焰踢", "贴身点着对手，靠灼伤压低它的攻击", "把目标挑到空中，打乱它的站位"],
        kind: "aim",
        range: 2.4,
        maxRange: 3.4,
        prepare: 7,
        active: 12,
        recover: 7,
        cooldown: 22,
        style: "kick",
        maximumTicks: 200,
        defaults: { ignite: false, ai: { maxChase: 6, preferUnlit: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("blazekick", "reach", pokemon) : 2.4, geometry: "cone", style: "fire",
                color: 0xE2531B, label: config && config.ignite === true ? "烈焰踢" : "火焰踢" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["blazekick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("blazekick", "tempo", context)),
                recover: Math.round(p("blazekick", "settle", context)),
                cooldown: Math.round(p("blazekick", "recharge", context)),
                active: skills["blazekick"].active,
                range: p("blazekick", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const embers = Math.max(6, Math.round(p("blazekick", "embers", action) * 0.6));
            action.present("blazekick:coil", blazekickScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, embers: embers, ignite: config && config.ignite ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const heading = aim(action);
            const target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const reach = Math.max(2.0, action.range());
            const power = p("blazekick", "kick", action);
            const chance = p("blazekick", "burnChance", action);
            const burnTicks = Math.max(40, Math.round(p("blazekick", "burnTicks", action)));
            const launch = Math.max(0.1, p("blazekick", "launch", action));
            const bulge = p("blazekick", "arc", action);
            const embers = Math.max(8, Math.round(p("blazekick", "embers", action)));
            const scale = Math.max(0.6, Math.min(1.8, bulge / 0.75));
            const intensity = Math.max(0.6, Math.min(2.4, power / 85));
            const aimEnd = targetBody !== null ? targetBody.position() : origin.plus(heading.scale(reach));
            const under = origin.plus(WorldCombat.point(0, 0.9, 0));
            const apex = origin.plus(heading.scale(reach * 0.55)).plus(WorldCombat.point(0, reach * 0.4 + bulge, 0));
            const aboveAim = aimEnd.plus(WorldCombat.point(0, 0.5 + bulge * 0.4, 0));
            // 沿上扬弧线做权威首碰：实体或墙先到就先算，判定与画出的火弧共用同一个落点。
            const contact = blazekickTrace(action, [under, apex, aboveAim, aimEnd], Math.max(0.22, Math.min(0.7, bulge * 0.45)));
            const stopped = contact !== null && (contact.hitEntity() || contact.blocked());
            const stop = stopped ? contact!.position() : aimEnd;
            const path = blazekickArc(origin, heading, reach, bulge, stop);
            const victim = contact !== null && contact.hitEntity() ? contact.target() : null;

            sound(action, "minecraft:entity.blaze.shoot");
            WorldFeedback.emit(world, blazekickScene, 1, stop,
                { moment: "spin", path: path, embers: embers, scale: scale, intensity: intensity,
                    direction: [heading.x(), heading.y(), heading.z()] }, 22);

            // 友方或自己先挡住腿路、或什么都没碰到，就只留一道空弧。
            if (victim === null || String(victim.ref()) === String(actor.ref()) || world.friendly(victim)) {
                WorldFeedback.emit(world, blazekickScene, 1, stop, { moment: "miss", embers: Math.round(embers * 0.5), scale: scale }, 18);
                WorldFeedback.text(world, stop.plus(WorldCombat.point(0, 0.8, 0)), blazekickMissText, [], 20);
                sound(action, "cobblemon:move.gust.actor");
                done(action);
                return;
            }

            const at = contact!.position();
            const landed = hurt(action, victim, "blazekick", power,
                { damage: damageSpec("blazekick", "kick"), contact: true, status: "burn", chance: chance, statusTicks: burnTicks });
            WorldFeedback.emit(world, blazekickScene, 1, at,
                { moment: "kick", target: String(victim.ref()), path: path, embers: embers, scale: scale,
                    intensity: Math.max(0.6, Math.min(2.4, power / 80)) }, 24);
            sound(action, "cobblemon:impact.fire");
            if (landed && world.valid(victim)) {
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), blazekickHitText, [], 22);
                const away = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
                const lift = away.length() < 0.05 ? WorldCombat.point(heading.x() * 0.2, launch, heading.z() * 0.2)
                    : away.unit().scale(0.25).plus(WorldCombat.point(0, launch, 0));
                // 挑飞只尝试原生允许：被击飞抗性或事件拒绝时不加升空表现。
                const lifted = world.hitImpulse(victim, lift);
                if (CombatStatus.has(world, victim, "burn")) {
                    world.ignite(victim, Math.max(20, Math.min(60, Math.round(burnTicks * 0.2))));
                    WorldFeedback.emit(world, blazekickScene, 1, at, { moment: "ignite", target: String(victim.ref()), embers: embers, scale: scale }, 24);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.4, 0)), blazekickBurnText, [], 24);
                    sound(action, "minecraft:entity.blaze.burn");
                }
                if (lifted) WorldFeedback.emit(world, blazekickScene, 1, at,
                    { moment: "launch", target: String(victim.ref()), launch: launch, embers: embers, scale: scale, intensity: intensity }, 22);
            }
            done(action);
        }
    });
}
