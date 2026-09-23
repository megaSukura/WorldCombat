/**
 * 爆炸头突击 / headcharge 的出手方式。
 *
 * 核心念头：一往无前的贯通头撞。低头、把爆炸头鼓起来，沿直线长驱直入，把挡路的一个个都撞飞——**撞中不停**，
 * 直到冲程走完或撞上墙；蓬松的头毛替它卸掉一部分反噬，所以每一记比同族都轻，但撞的人越多、累加得越多。
 * 没撞到就一路冲过去，不额外受伤。
 * 一句话：本族里最长、最重、唯一能一次串起一串人，且代价按命中人数累加的一招。
 *
 * 两幕（多目标时在冲刺里重复命中）：
 *   起（windup，提交前）：低头、鼓毛蓄势，只播预告表现。
 *   冲（charge → impact…/ end）：提交后逐刻沿瞄准方向推进；trace 撞上活体即按 ram 结算接触伤害（后续目标吃 through 占比）、
 *       按 recoil 比例反伤自己（共享结算）、把目标顶开 shove 格，然后**继续前进**；撞到底、撞墙或推不动即收势。
 *   收（end）：冲程走完，撞中几个就在浮字里报几个；一个没撞到也算安全收势。
 *
 * 与同族分开：双刃头锤只撞一个、反噬重、冲空栽地；猛撞短而轻；疯狂伏特带电灌麻痹；地狱翻滚要抓住再摔。
 * 爆炸头突击凭「一次撞飞一串人、自己按人数掉血」和锁定式会转的弧线把它认出来。
 * 配置 hunt（锁定）由 resolve 改时序射程、由公式改威力与击退，提交后才触碰世界。
 */
namespace PokemonSkills {
    const headchargeScene = "world_combat:move_headcharge";
    const headchargeHitText = "world_combat.move.headcharge.text.hit";
    const headchargeMissText = "world_combat.move.headcharge.text.miss";

    /** 锁定式：每刻把冲撞方向朝最近的敌人微调，最多 turnRate 度；找不到人保持原方向。 */
    function headchargeSteer(scope: CombatWorld, origin: CombatPoint, direction: CombatPoint, radius: number, turnRate: number): CombatPoint {
        const actors = scope.query(origin, radius + 2.5, false);
        let best: CombatPoint | null = null, bestDistance = Infinity;
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (!scope.valid(other) || scope.friendly(other)) continue;
            const body = scope.observe(other);
            if (body === null) continue;
            const to = body.position().minus(origin), distance = to.length();
            if (distance < 0.15 || distance >= bestDistance) continue;
            bestDistance = distance; best = to.unit();
        }
        if (best === null) return direction;
        const dot = Math.max(-1, Math.min(1, direction.x() * best.x() + direction.y() * best.y() + direction.z() * best.z()));
        const angle = Math.acos(dot) * 180 / Math.PI;
        if (angle <= 0.001 || angle <= turnRate) return best;
        const amount = Math.min(1, turnRate / angle);
        return direction.scale(1 - amount).plus(best.scale(amount)).unit();
    }

    define({
        id: "headcharge",
        cooldownParameter: "recharge",
        name: "Head Charge",
        description: "The user charges its head into the target, using its powerful guard hair. This also damages the user a little.",
        uses: ["沿直线一次撞飞挡路的一串人", "用最厚的头毛换取本族最轻的单次反噬", "锁定式追击一个会侧移的对手"],
        kind: "enemy",
        range: 6.1,
        maxRange: 9.5,
        prepare: 10,
        active: 40,
        recover: 12,
        cooldown: 48,
        style: "impact",
        defaults: { hunt: false, ai: { maxChase: 12, preferLine: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("headcharge", "radius", pokemon) * 1.6, geometry: "line", style: "impact", color: 0x6B5236, label: "爆炸头突击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["headcharge"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("headcharge", "tempo", context)),
                recover: Math.round(p("headcharge", "aftercast", context)),
                cooldown: Math.round(p("headcharge", "recharge", context)),
                range: p("headcharge", "charge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_headcharge:windup", headchargeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hunt: !!(config && config.hunt) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const length = p("headcharge", "charge", action);
            const pace = p("headcharge", "pace", action);
            const radius = p("headcharge", "radius", action);
            const traceAhead = p("headcharge", "traceAhead", action);
            const power = p("headcharge", "ram", action);
            const recoil = p("headcharge", "recoil", action);
            const through = p("headcharge", "through", action);
            const shove = p("headcharge", "shove", action);
            const afro = Math.round(p("headcharge", "afro", action));
            const minimumMove = p("headcharge", "minimumMove", action);
            const turnRate = p("headcharge", "turnRate", action);
            const hunt = !!(config && config.hunt);
            let direction = aim(action);
            const scale = radius / 0.62;
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            const struck: { [ref: string]: boolean } = {};
            let travelled = 0, firstHit = false, hits = 0;

            sound(action, "minecraft:entity.ravager.roar");
            WorldFeedback.emit(world, headchargeScene, 1, action.origin(),
                { moment: "charge", direction: [direction.x(), direction.y(), direction.z()],
                    afro: afro, scale: scale, intensity: intensity, hunt: hunt ? 1 : 0 }, 60);

            function track(current: CombatAction): void {
                const scope = current.world();
                WorldFeedback.keep(scope, "headcharge:track:" + String(actor.ref()), headchargeScene, 1, current.origin(),
                    { moment: "track", direction: [direction.x(), direction.y(), direction.z()], afro: afro, scale: scale }, 10);
            }

            function finish(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    if (hits === 0) {
                        WorldFeedback.emit(scope, headchargeScene, 1, body.position(), { moment: "end", afro: afro, scale: scale, hits: 0 }, 24);
                        WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.5, 0)), headchargeMissText, [], 26);
                    } else {
                        WorldFeedback.emit(scope, headchargeScene, 1, body.position(),
                            { moment: "end", afro: afro, scale: scale, hits: hits, intensity: intensity }, 24);
                    }
                }
                sound(current, "minecraft:entity.generic.big_fall");
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                if (hunt) direction = headchargeSteer(scope, current.origin(), direction, radius, turnRate);
                const origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { finish(current); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && !struck[String(victim.ref())]) {
                        struck[String(victim.ref())] = true;
                        const amount = firstHit ? power * through : power;
                        firstHit = true;
                        const landed = impact(current, hit, "headcharge", amount,
                            { damage: damageSpec("headcharge", "ram"), contact: true, recoil: recoil });
                        hits++;
                        WorldFeedback.emit(scope, headchargeScene, 1, hit.position(),
                            { moment: "impact", target: String(victim.ref()), afro: afro, scale: scale,
                                burst: Math.round(afro * (1 + hits * 0.25)),
                                intensity: Math.max(0.6, Math.min(2.4, amount / 120)), hits: hits }, 30);
                        sound(current, "minecraft:entity.iron_golem.attack");
                        if (landed && scope.valid(victim)) {
                            const body = scope.observe(victim);
                            if (body !== null) {
                                const away = body.position().minus(origin);
                                scope.displace(victim, (away.length() >= 0.05 ? away.unit() : direction).scale(shove));
                            }
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.5, 0)), headchargeHitText, [hits], 26);
                        }
                    }
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) { finish(current); return; }
                track(current);
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
