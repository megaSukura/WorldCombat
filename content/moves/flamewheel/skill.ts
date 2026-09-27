/**
 * 火焰轮 / flamewheel 的出手方式。
 *
 * 核心念头：蜷成一团火轮、卷着向前滚——不停在第一个身上，碾过路上每一个挡住它的对手，火沿轮缘一路蹭过去。
 * 滚完一圈展开身体时，自己身上的冰也被这团火化掉了。它是本族里唯一没有反伤、靠滚动走路的一招。
 *
 * 选取 `kind: "aim"`：自由方向或世界点都能滚，也能空滚来解冻自己；提交后不要求存在敌人，实体阻挡沿用原生。
 *
 * 两幕：
 *   蜷（windup，提交前）：身体缩成一团、火包住轮缘，只播预告。
 *   滚（roll → wake → impact）：提交后逐刻沿瞄准方向滚动，身周火轮立着旋转、身后只沿真正滚过的路段留短余焰；
 *       在本刻预算内用原生 moveSweep（带已接触 refs）连续扫过，撞到的活体即按 wheel 结算接触伤害、按 burnChance
 *       蹭上灼伤（共享状态）、把目标挤开 shove 格，然后**继续滚**够到后面的身体；实墙立刻停，后续目标按 through
 *       打折，最多碾过 pierceCount 个人。空滚只解冻、不打地场。
 *
 * 与同族分开：闪焰冲锋是一条拖长的火线并自伤、电光是贴身短促的一点电、伏特攻击是蓄电爆冲并放电波及旁人；
 * 火焰轮独有的是一路碾过去的滚动与滚完化掉自己身上的冰。配置 fierce（烈焰轮）由 resolve 改时序、由公式
 * 改威力/距离/灼伤，提交后才触碰世界。
 */
namespace PokemonSkills {
    const flamewheelScene = "world_combat:move_flamewheel";
    const flamewheelHitText = "world_combat.move.flamewheel.text.hit";
    const flamewheelThawText = "world_combat.move.flamewheel.text.thaw";
    const flamewheelFizzleText = "world_combat.move.flamewheel.text.fizzle";

    define({
        freeMovement: true,
        id: "flamewheel",
        cooldownParameter: "recharge",
        name: "Flame Wheel",
        description: "朝瞄准方向蜷成火轮滚过去，碾过沿途每个敌人并有机会使其灼伤；滚动起步时解除自身冰冻，没有敌人也能空滚。",
        uses: ["滚过挤在一起的一排对手", "用火轮追着贴脸的对手碾过去", "在自己身上的冰需要化掉时借这团火"],
        kind: "aim",
        range: 4.6,
        maxRange: 6.5,
        prepare: 7,
        active: 26,
        recover: 8,
        cooldown: 30,
        style: "roll",
        defaults: { fierce: false, ai: { maxChase: 9, preferIgnite: true, preferCrowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("flamewheel", "radius", pokemon) * 1.7, geometry: "line", style: "fire",
                color: 0xF08030, label: config && config.fierce === true ? "烈焰轮" : "疾风轮" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flamewheel"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("flamewheel", "tempo", context)),
                recover: Math.round(p("flamewheel", "aftercast", context)),
                cooldown: Math.round(p("flamewheel", "recharge", context)),
                active: skills["flamewheel"].active,
                range: p("flamewheel", "roll", context) + 0.5
            };
        },
        // 滚动起步按原生 defrost 允许在被冻时起手：本招只解除自身冰冻这一项限制，别的来源的无关控制不受影响。
        eligibility: function (context) {
            if (context.phase === "damage") return;
            CombatStatus.selfCure(context, ["frozen"]);
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_flamewheel:curl", flamewheelScene, 1, action.origin(),
                JSON.stringify({ moment: "curl", fierce: !!(config && config.fierce), windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(flamewheelScene);
            const world = action.world();
            const actor = action.actor();
            const length = p("flamewheel", "roll", action);
            const pace = p("flamewheel", "spin", action);
            const radius = p("flamewheel", "radius", action);
            const traceAhead = p("flamewheel", "traceAhead", action);
            const minimumMove = p("flamewheel", "minimumMove", action);
            const power = p("flamewheel", "wheel", action);
            const through = p("flamewheel", "through", action);
            const chance = p("flamewheel", "burnChance", action);
            const burnTicks = Math.round(p("flamewheel", "burnTicks", action));
            const shove = p("flamewheel", "shove", action);
            const flames = Math.round(p("flamewheel", "flames", action));
            const pierceCount = Math.max(1, Math.round(p("flamewheel", "pierceCount", action)));
            // 贴地滚动：把瞄准方向压成水平，避免垂直分量让火轮扫到地面而被挡停。
            const aimed = aim(action);
            const level = WorldCombat.point(aimed.x(), 0, aimed.z());
            const flat = level.length() > 0.001 ? level : WorldCombat.point(action.direction().x(), 0, action.direction().z());
            const direction = flat.length() > 0.001 ? flat.unit() : WorldCombat.point(0, 0, 1);
            // 方向已冻结：目标离场或死亡不再中断这一滚，空滚照常解冻。
            action.releaseTarget();
            const scale = radius / 0.5;
            const intensity = Math.max(0.6, Math.min(2.4, power / 62));
            const start = action.origin();
            // 轮缘立在行进平面：形状轴取水平的侧向，orient:direction 把环面转向与该轴垂直，火轮因此立着滚。
            const axis = WorldGeometry.basis(direction).right;
            const axisData = [axis.x(), axis.y(), axis.z()];
            const struck: { [ref: string]: boolean } = {};
            const struckList: string[] = [];
            let travelled = 0, hits = 0, settled = false;

            // 只画真正滚过的那一段：每次把起点到当前实际落点的两个顶点交给 track，未到/墙后不再预先整线撒火。
            function showRoll(current: CombatAction, from: CombatPoint, to: CombatPoint): void {
                movementScenes.show(current, "roll", to, { moment: "roll", direction: axisData,
                    path: [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]],
                    flames: flames, scale: scale, intensity: intensity });
            }

            /** 一次接触的结算：伤害真的落地才占「碾过」预算、才顶开与报数；接触本身先记一次，避免逐刻重复。 */
            function resolveContact(current: CombatAction, scope: CombatWorld, victim: CombatActor, hit: CombatImpact): void {
                const ref = String(victim.ref());
                struck[ref] = true; struckList.push(ref);
                const point = hit.position();
                const amount = hits === 0 ? power : power * through;
                const already = CombatStatus.has(scope, victim, "burn");
                const landed = impact(current, hit, "flamewheel", amount,
                    { damage: damageSpec("flamewheel", "wheel"), contact: true,
                        status: already ? "" : "burn", chance: already ? 0 : chance, statusTicks: burnTicks });
                WorldFeedback.emit(scope, flamewheelScene, 1, point,
                    { moment: "impact", target: ref, flames: flames, scale: scale,
                        intensity: Math.max(0.6, Math.min(2.4, amount / 60)) }, 28);
                sound(current, "cobblemon:move.flamewheel.target");
                sound(current, "cobblemon:impact.fire");
                if (landed) {
                    if (scope.valid(victim)) {
                        scope.hitDisplace(victim, direction.scale(shove));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), flamewheelHitText, [hits + 1], 26);
                    }
                    hits++;
                }
            }

            /**
             * 在本刻预算内逐体推进：原生 moveSweep 带已接触 refs，撞到的第一个身体只结算一次就被排除，
             * 同一刻可以继续够到后面的身体，密排的两个人不会因为一次裸 displace 冲过余段而漏掉第二个。
             * 返回实际移动量与是否撞墙；到碾过上限或无法推进即停。
             */
            function spend(current: CombatAction, scope: CombatWorld, budget: number): { moved: number; blocked: boolean } {
                let remaining = budget, moved = 0, guard = 0;
                while (remaining > 0.001 && guard++ < 16) {
                    if (hits >= pierceCount) break;
                    const before = current.origin();
                    const hit = current.moveSweep(direction.scale(remaining), radius, JSON.stringify(struckList));
                    const advanced = current.origin().minus(before).length();
                    moved += advanced; remaining -= advanced;
                    if (hit.hitEntity()) {
                        const victim = hit.target();
                        if (victim !== null && !struck[String(victim.ref())]) resolveContact(current, scope, victim, hit);
                        continue;
                    }
                    if (hit.blocked()) return { moved: moved, blocked: true };
                    if (advanced < minimumMove) return { moved: moved, blocked: false };
                }
                return { moved: moved, blocked: false };
            }

            sound(action, "cobblemon:move.flamewheel.actor");
            // 火轮滚起来时顺带把施法者身上的冰化掉（原生 defrost）；只有真的解冻了才播化冰一幕。
            if (CombatStatus.cure(world, actor, "frozen")) {
                const self = world.observe(actor);
                if (self !== null) {
                    WorldFeedback.emit(world, flamewheelScene, 1, self.position(), { moment: "thaw", scale: scale }, 22);
                    WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.2, 0)), flamewheelThawText, [], 24);
                }
            }
            showRoll(action, start, start);

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (hits === 0) {
                    const scope = current.world(), body = scope.observe(current.actor());
                    if (body !== null) {
                        WorldFeedback.emit(scope, flamewheelScene, 1, body.position(), { moment: "fizzle", scale: scale }, 20);
                        WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), flamewheelFizzleText, [], 22);
                    }
                }
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001 || hits >= pierceCount) { finish(current); return; }
                const before = current.origin();
                const result = spend(current, scope, step);
                travelled += result.moved;
                const after = current.origin();
                if (after.minus(before).length() > 0.001) showRoll(current, before, after);
                if (result.blocked || result.moved < minimumMove || travelled >= length || hits >= pierceCount) { finish(current); return; }
                movementScenes.show(current, "wake", after, { moment: "wake", flames: flames, scale: scale });
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
