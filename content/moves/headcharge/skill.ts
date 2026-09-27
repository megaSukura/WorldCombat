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

    /**
     * 锁定式：每刻把冲撞方向朝最近的敌人微调，最多 turnRate 度。
     * 只追尚未撞过、可见、且在前向可达圆锥内的敌体；找不到就保持原方向，不为贴身的侧后目标原地兜圈。
     */
    function headchargeSteer(scope: CombatWorld, origin: CombatPoint, direction: CombatPoint, radius: number, turnRate: number,
                             struck: { [ref: string]: boolean }): CombatPoint {
        const actors = scope.query(origin, radius + 2.5, false);
        let best: CombatPoint | null = null, bestDistance = Infinity;
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (!scope.valid(other) || scope.friendly(other) || struck[String(other.ref())]) continue;
            const body = scope.observe(other);
            if (body === null || !body.visible()) continue;
            const to = body.position().minus(origin), distance = to.length();
            if (distance < 0.15 || distance >= bestDistance) continue;
            const unit = to.unit();
            // 前向圆锥：目标必须大体在冲锋前进方向，避免为贴身最近体反身回旋。
            if (direction.x() * unit.x() + direction.y() * unit.y() + direction.z() * unit.z() < 0.2) continue;
            bestDistance = distance; best = unit;
        }
        if (best === null) return direction;
        const dot = Math.max(-1, Math.min(1, direction.x() * best.x() + direction.y() * best.y() + direction.z() * best.z()));
        const angle = Math.acos(dot) * 180 / Math.PI;
        if (angle <= 0.001 || angle <= turnRate) return best;
        const amount = Math.min(1, turnRate / angle);
        return direction.scale(1 - amount).plus(best.scale(amount)).unit();
    }

    define({
        freeMovement: true,
        id: "headcharge",
        cooldownParameter: "recharge",
        name: "Head Charge",
        description: "沿冲锋路线撞击多个敌人，每人只撞一次，命中不会停止冲锋。每撞中一个目标，都会按它实际受到的伤害结算反伤。",
        uses: ["沿直线一次撞飞挡路的一串人", "以反伤为代价发起强力冲撞", "锁定式追击一个会侧移的对手"],
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
            const movementScenes = WorldFeedback.actionScenes(headchargeScene);
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
            const struckList: string[] = [];
            let travelled = 0, firstHit = false, hits = 0;

            sound(action, "minecraft:entity.ravager.roar");

            function heading(): number[] { return [direction.x(), direction.y(), direction.z()]; }

            function showCharge(current: CombatAction, origin: CombatPoint): void {
                movementScenes.show(current, "charge", origin, { moment: "charge", direction: heading(),
                    afro: afro, scale: scale, intensity: intensity, hunt: hunt ? 1 : 0 });
            }

            /** 每刻按真实 heading 同步 charge（速度线朝向）与 track（贴地尘带），转弯时两者一起弯。 */
            function track(current: CombatAction): void {
                const origin = current.origin();
                showCharge(current, origin);
                movementScenes.show(current, "track", origin, { moment: "track", direction: heading(), afro: afro, scale: scale });
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
                movementScenes.finish(current, done);
            }

            /**
             * 单一接触的结算：无论伤害是否落地都先把该体记为已接触（去重防重复伤害），
             * 但首个「有效重击」档位与命中计数只在伤害真正落地时消费；友体／免伤接触不发成功回执。
             */
            function resolveContact(current: CombatAction, scope: CombatWorld, origin: CombatPoint, victim: CombatActor, hit: CombatImpact): void {
                const ref = String(victim.ref());
                if (struck[ref]) return;
                struck[ref] = true;
                struckList.push(ref);
                const isFirst = !firstHit;
                const amount = isFirst ? power : power * through;
                scope.originData("world_combat:headcharge/recoil", JSON.stringify({ direction: [-direction.x(), -direction.y(), -direction.z()], afro: afro, scale: scale }));
                const landed = impact(current, hit, "headcharge", amount,
                    { damage: damageSpec("headcharge", "ram"), contact: true, recoil: recoil });
                if (!landed) return;
                if (isFirst) firstHit = true;
                hits++;
                const struckIntensity = Math.max(0.6, Math.min(2.4, amount / 120));
                WorldFeedback.emit(scope, headchargeScene, 1, hit.position(),
                    { moment: "impact", target: ref, afro: afro, scale: scale,
                        burst: Math.round(afro * (1 + hits * 0.25)), intensity: struckIntensity, hits: hits }, 30);
                sound(current, "minecraft:entity.iron_golem.attack");
                if (scope.valid(victim)) {
                    const body = scope.observe(victim);
                    if (body !== null) {
                        const away = body.position().minus(origin);
                        scope.hitDisplace(victim, (away.length() >= 0.05 ? away.unit() : direction).scale(shove));
                    }
                    WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.5, 0)), headchargeHitText, [hits], 26);
                }
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                if (hunt) direction = headchargeSteer(scope, current.origin(), direction, radius, turnRate, struck);
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001 || spend(current, step)) { finish(current); return; }
                if (travelled >= length) { finish(current); return; }
                track(current);
                current.after(1, advance);
            }

            /**
             * 在本刻预算内逐体推进：用原生 action.moveSweep(...,已接触refs) 连续扫过，
             * 每撞到一个尚未结算的活体就结算一次；已接触体被排除后同刻可以继续够到下一个身体，
             * 实墙或推不动的接触保持真实停止，不再用一次性裸 displace 冲过整段而漏掉第二个身体。
             * 返回是否应当立刻收势（撞墙／无法推进）。
             */
            function spend(current: CombatAction, step: number): boolean {
                const scope = current.world();
                let remaining = step, guard = 0;
                while (remaining > 0.001 && guard++ < 16) {
                    const before = current.origin();
                    const hit = current.moveSweep(direction.scale(remaining), radius, JSON.stringify(struckList));
                    const moved = current.origin().minus(before).length();
                    travelled += moved; remaining -= moved;
                    if (hit.hitEntity()) {
                        const victim = hit.target();
                        if (victim !== null && !struck[String(victim.ref())]) resolveContact(current, scope, before, victim, hit);
                        continue;
                    }
                    if (hit.blocked()) return true;                 // 实墙：真实停止
                    if (moved < minimumMove) return true;            // 无法推进
                }
                return remaining > 0.001;
            }

            showCharge(action, action.origin());
            advance(action);
        }
    });
    NativeEffects.recoilApplied.define({ id: "world_combat:move_headcharge/recoil", apply: function (receipt) {
        if (receipt.damage.move !== "headcharge" || !receipt.world.valid(receipt.actor)) return;
        const body = receipt.world.observe(receipt.actor), raw = receipt.world.originData("world_combat:headcharge/recoil");
        if (!body || !raw) return;
        const data = JSON.parse(raw);
        WorldFeedback.emit(receipt.world, headchargeScene, 1, body.position(), { moment: "recoil", direction: data.direction,
            afro: data.afro, scale: data.scale, intensity: Math.max(.5, Math.min(2, receipt.amount / 40)) }, 16);
    } });
}
