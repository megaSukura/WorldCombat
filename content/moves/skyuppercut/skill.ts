/**
 * 冲天拳 / skyuppercut 的出手方式。
 *
 * 核心念头：**蹲身把拳压到最低，再沿身前一条竖直的弧线一口气挑上去**——一枚拳尖贴着身体从腰下扫到头顶，
 * 被扫到的人被整个顶离地面（垂直位移，而不是沿地面推远）；对已经离地的目标这一挑更狠。它是全族唯一把对手
 * 送上天的一记。
 *
 * 三幕：
 *   起（windup，提交前）：压身、拳收到腰下、脚下蹬劲，只播预告。
 *   挑（rise）：提交后拳尖沿身前一条由低到高的真实弧逐段扫过：每刻取当前真实子段，判定用与画面同一组端点
 *       （`bodySegment`，拳面半径由体宽与弧角决定），弧内的非友方各吃一记 `uppercut`，每个目标整招只结算一次。
 *       被挑中的目标得到 `lift` 的向上初速；只有真的被推动/顶起的才播上抛轨迹，免疫击飞者保留伤害、不加升空。
 *       弧的竖直上限只由真实方块接触截断——头顶有低墙就把整条弧压短，不越过它。
 *   收（hang／whiff）：基础命中始终给一下接触回执；离地命中另加更亮的空中强调（不表示悬停）；一个都没挑中只留空弧。
 *
 * 选取 `kind: "aim"`：自由朝向、可空拳；方向或任意阵营实体都行。
 *
 * 与同族分开：百万吨重拳是沿地面的直拳推离、臂锤是过顶下砸、地球上投/借力摔是抓取摔出；
 * 冲天拳是唯一「垂直向上、把人顶到空中」的一记。
 *
 * 配置 `rising` 由公式改威力与挑高，由 resolve 改时序；提交后才触碰世界。数值预算不变，只把同一份总威力
 * 落实成一段真实的扫弧，不按子段重复结算。
 */
namespace PokemonSkills {
    const skyuppercutScene = "world_combat:move_skyuppercut";
    const skyuppercutHeadScene = "world_combat:move_skyuppercut_head";
    const skyuppercutHitText = "world_combat.move.skyuppercut.text.hit";
    const skyuppercutAirText = "world_combat.move.skyuppercut.text.air";
    const skyuppercutMissText = "world_combat.move.skyuppercut.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function skyuppercutHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 上勾的竖直弧：低→高采样点的二次曲线，判定与表现共用同一组点。 */
    function skyuppercutArcPoint(origin: CombatPoint, heading: CombatPoint, reach: number, height: number, t: number): CombatPoint {
        const low = origin.plus(heading.scale(reach * 0.25)).minus(WorldCombat.point(0, 0.5, 0));
        const mid = origin.plus(heading.scale(reach * 0.55)).plus(WorldCombat.point(0, height * 0.4, 0));
        const high = origin.plus(heading.scale(reach * 0.7)).plus(WorldCombat.point(0, height, 0));
        const u = 1 - t;
        return low.scale(u * u).plus(mid.scale(2 * u * t)).plus(high.scale(t * t));
    }

    define({
        id: "skyuppercut",
        cooldownParameter: "recharge",
        name: "Sky Uppercut",
        description: "蹲身把拳压到最低，再沿身前一条竖直的弧线一口气挑上去：被命中的对手整个被顶离地面，随后落回；对命中时已经离地的目标这一挑更狠。它是全族唯一把对手送上天的一记。",
        uses: ["一记上勾把贴脸的对手顶到空中", "追击空中或跳起的对手、把它打得更狠", "把敌人挑离阵地，给下一拍创造机会"],
        kind: "aim",
        range: 2.3,
        maxRange: 3.2,
        prepare: 8,
        active: 14,
        recover: 9,
        cooldown: 32,
        style: "punch",
        defaults: { rising: true, ai: { maxChase: 5, punishAir: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("skyuppercut", "reach", pokemon), geometry: "cone", style: "punch", color: 0xFFC06A,
                label: config && config.rising === false ? "贯顶式" : "冲天式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["skyuppercut"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("skyuppercut", "tempo", context)),
                recover: Math.round(p("skyuppercut", "aftercast", context)),
                cooldown: Math.round(p("skyuppercut", "recharge", context)),
                active: skills["skyuppercut"].active,
                range: p("skyuppercut", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_skyuppercut:windup", skyuppercutScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", windup: prepare, rising: config && config.rising !== false }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const heading = skyuppercutHeading(aim(action));
            const reach = Math.max(1.7, p("skyuppercut", "reach", action));
            const arc = Math.max(40, Math.min(110, p("skyuppercut", "arc", action)));
            const airReach = Math.max(1.6, p("skyuppercut", "airReach", action));
            const lift = Math.max(0.15, p("skyuppercut", "lift", action));
            const push = Math.max(0, p("skyuppercut", "push", action));
            const airBonus = Math.max(1, p("skyuppercut", "airBonus", action));
            const power = p("skyuppercut", "uppercut", action);
            const sparks = Math.max(8, Math.round(p("skyuppercut", "sparks", action)));

            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const width = self === null ? 0.9 : self.width();

            // 拳面半径：体宽给横向覆盖，弧角表达这一记扫开多宽；判定与表现共用这一条粗弧。
            const fist = Math.max(0.3, Math.min(1.0, width * 0.35 + Math.sin(arc * Math.PI / 360) * 0.5));
            const scale = Math.max(0.6, Math.min(1.8, Math.max(airReach, reach) / 2.4));
            const intensity = Math.max(0.6, Math.min(2.3, power / 85));

            // 头顶真实净空：只用真实方块接触截断，不设人为下限；过低时整条弧被压短。
            let top = airReach;
            const overhead = WorldGeometry.blockHit(world, origin.plus(WorldCombat.point(0, 0.4, 0)), origin.plus(WorldCombat.point(0, airReach + 0.6, 0)));
            if (overhead !== null) top = Math.max(0.2, overhead.position().y() - origin.y());

            const steps = 5;
            const struck: { [ref: string]: boolean } = Object.create(null);
            const scenes = WorldFeedback.actionScenes(skyuppercutScene);
            const heads = WorldFeedback.actionScenes(skyuppercutHeadScene);
            let launched = 0, airborne = 0;

            sound(action, "minecraft:entity.player.attack.strong");

            function finish(current: CombatAction): void {
                if (launched === 0) {
                    WorldFeedback.emit(current.world(), skyuppercutScene, 1,
                        origin.plus(heading.scale(reach * 0.6)).plus(WorldCombat.point(0, 0.6, 0)),
                        { moment: "whiff", scale: scale, intensity: intensity }, 18);
                    WorldFeedback.text(current.world(), origin.plus(WorldCombat.point(0, 1.2, 0)), skyuppercutMissText, [], 22);
                    sound(current, "minecraft:entity.player.attack.weak");
                } else if (airborne > 0) {
                    WorldFeedback.text(current.world(), origin.plus(WorldCombat.point(0, 1.2, 0)), skyuppercutAirText, [launched], 24);
                    sound(current, "cobblemon:impact.fighting");
                } else {
                    WorldFeedback.text(current.world(), origin.plus(WorldCombat.point(0, 1.2, 0)), skyuppercutHitText, [launched], 24);
                    sound(current, "cobblemon:impact.fighting");
                }
                scenes.finish(current, done);
            }

            function step(current: CombatAction, index: number): void {
                const scope = current.world();
                const previous = skyuppercutArcPoint(origin, heading, reach, top, index / steps);
                let tip = skyuppercutArcPoint(origin, heading, reach, top, (index + 1) / steps);
                let stopped = false;
                const wall = WorldGeometry.blockHit(scope, previous, tip);
                if (wall !== null) { tip = wall.position(); stopped = true; }

                // 这一刻的真实子段：判定与表现读同一组端点。
                const data = { moment: "rise",
                    path: [[previous.x(), previous.y(), previous.z()], [tip.x(), tip.y(), tip.z()]],
                    from: [previous.x(), previous.y(), previous.z()], tip: [tip.x(), tip.y(), tip.z()],
                    reach: reach, arc: arc, airReach: top, sparks: sparks, scale: scale, intensity: intensity,
                    direction: [heading.x(), heading.y(), heading.z()], step: index, steps: steps };
                scenes.show(current, "arc" + index, tip, data);
                heads.show(current, "head", tip, data);

                WorldGeometry.selectBodies(scope, WorldGeometry.bodySegment(previous, tip, fist),
                    function (victim: CombatActor, facts: CombatObservation) {
                        const ref = String(victim.ref());
                        if (struck[ref] || facts.friendly() || ref === String(actor.ref())) return;
                        if (!scope.clear(origin, facts.position())) return;
                        const offGround = !facts.grounded();
                        const per = power * (offGround ? airBonus : 1);
                        const at = WorldGeometry.closestOnSegment(facts.position(), previous, tip);
                        if (!hurt(current, victim, "skyuppercut", per,
                            { damage: damageSpec("skyuppercut", "uppercut"), contact: true, punch: true })) return;
                        struck[ref] = true;
                        launched++;
                        if (offGround) airborne++;
                        // 基础命中始终反馈：只要真的造成伤害就有一记接触回执。
                        WorldFeedback.emit(scope, skyuppercutScene, 1, at,
                            { moment: "hit", target: ref, offGround: offGround ? 1 : 0,
                                sparks: sparks, scale: scale, intensity: intensity }, 18);
                        // 只有真的被顶起或推出去才播上抛：免疫击飞者保留伤害、不加升空表现。
                        const moved = scope.hitDisplace(victim, heading.scale(push));
                        const lifted = scope.hitImpulse(victim, WorldCombat.point(0, lift, 0));
                        if (moved > 0.001 || lifted)
                            WorldFeedback.emit(scope, skyuppercutScene, 1, facts.position(),
                                { moment: "launch", target: ref, lift: lift, push: push, offGround: offGround ? 1 : 0,
                                    sparks: sparks, scale: scale, intensity: intensity }, 20);
                        if (offGround)
                            WorldFeedback.emit(scope, skyuppercutScene, 1, facts.position(),
                                { moment: "hang", target: ref, scale: scale, intensity: intensity }, 20);
                    });

                if (stopped || index + 1 >= steps) { finish(current); return; }
                current.after(1, function (next: CombatAction): void { step(next, index + 1); });
            }

            step(action, 0);
        }
    });
}
