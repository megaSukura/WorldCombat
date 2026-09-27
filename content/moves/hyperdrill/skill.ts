/**
 * 强力钻 / hyperdrill 的出手方式。
 *
 * 核心念头：把身体最尖的一点高速旋成钻头，沿着瞄准方向一路凿穿——它不在乎对手撑了什么，先把挡在前面的
 *   守护整层凿开，再按这一记的重力砸进去；贯穿式会一路钻过多个目标。
 *
 * 三幕（提交前只播预告）：
 *   旋（wind，提交前）：压低身子、尖端旋起来，只播一记预告。
 *   钻（charge → bore）：提交后朝当刻自由瞄准方向冲 `reach` 格（每刻 `rush`）；每碰上一个新目标，在**真实首
 *       接触点**先凿掉它最多 `shred` 层守护（`world_combat:guard` 的 dispel），再按 `drill` 结算接触伤害并把它
 *       顶开 `push`。贯穿式最多钻穿 `pierce` 个目标后收势，定钻式钻到第一个就收；目标纹丝不动（Boss／硬碰撞）
 *       时在接触点收势，不靠剩余位移穿模。撞墙或冲满射程也收。
 *   收（skid）。
 *
 * 与同族分开：佯攻先掀后戳、快而轻；强力钻连撕带砸、慢而猛，是一条直线的凿穿。守护是共享机制 GuardEffects，
 *   所以对宝可梦、原版生物、其他模组生物和玩家一视同仁。
 *
 * 自由瞄准：`kind: "aim"` 接受任意阵营实体或世界点，目标只用来定初速方向；没有输入目标时照常沿当刻方向
 *   空钻，命中权限仍由命中层按原生敌我判定。墙由原生扫掠真实截断，本招不破坏方块。
 *
 * 配置 `through` 由公式改威力／射程／冲速／贯穿人数与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const hyperdrillScene = "world_combat:move_hyperdrill";
    const hyperdrillHeadScene = "world_combat:move_hyperdrill_head";
    const hyperdrillBoreText = "world_combat.move.hyperdrill.text.bore";
    const hyperdrillDrillText = "world_combat.move.hyperdrill.text.drill";
    const hyperdrillMissText = "world_combat.move.hyperdrill.text.miss";
    /** 表现里的参考半径：`data.scale = 实际判定半径 / 这个数`。 */
    const hyperdrillReferenceRadius = 0.5;

    /** 凿开目标身上最多 `budget` 层保护守护；返回真正凿掉的层数。 */
    function hyperdrillShred(world: CombatWorld, victim: CombatActor, budget: number): number {
        const guards = GuardEffects.barriers(world, victim);
        let broken = 0;
        for (let index = 0; index < guards.length && broken < budget; index++) {
            if (world.operation(guards[index].id(), "world_combat:dispel", "{}")) broken++;
        }
        return broken;
    }

    define({
        freeMovement: true,
        id: "hyperdrill",
        cooldownParameter: "recharge",
        name: "Hyper Drill",
        description: "把身体最尖的一点高速旋成钻头，沿着瞄准方向一路凿穿：先把挡在前面的守护整层凿开，再按这一记的重力砸进去并把目标顶开。贯穿式会一路钻过多个目标。",
        uses: ["凿穿着了守护的目标强行打进去", "沿一条线一次穿过排在一起的几个敌人", "用高额的接触伤害收掉一个挡在前面的人"],
        kind: "aim",
        range: 2.8,
        maxRange: 5.8,
        prepare: 9,
        active: 0,
        recover: 9,
        cooldown: 34,
        maximumTicks: 240,
        style: "drill",
        defaults: { through: false, ai: { maxChase: 8, breakGuard: true } },
        fields: [flag("through", "贯穿式")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("hyperdrill", "reach", pokemon) : 3.0, geometry: "line", style: "drill", color: 0xC9D2E0,
                label: config && config.through === true ? "强力钻·贯穿" : "强力钻·定钻" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["hyperdrill"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("hyperdrill", "tempo", context)),
                recover: Math.round(p("hyperdrill", "recover", context)),
                cooldown: Math.round(p("hyperdrill", "recharge", context)),
                active: 0,
                range: p("hyperdrill", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_hyperdrill:charge", hyperdrillScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", through: config && config.through === true ? 1 : 0,
                    grains: Math.round(p("hyperdrill", "grains", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(hyperdrillScene);
            const heads = WorldFeedback.actionScenes(hyperdrillHeadScene);
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body !== null ? body.position() : action.origin();
            const reach = Math.max(1.6, p("hyperdrill", "reach", action));
            const rush = Math.max(0.25, p("hyperdrill", "rush", action));
            const radius = Math.max(0.36, p("hyperdrill", "radius", action));
            const drill = p("hyperdrill", "drill", action);
            const shred = Math.max(1, Math.round(p("hyperdrill", "shred", action)));
            const pierce = Math.max(1, Math.round(p("hyperdrill", "pierce", action)));
            const grains = Math.max(8, Math.round(p("hyperdrill", "grains", action)));
            const scale = radius / hyperdrillReferenceRadius;
            const minimumMove = 0.03;
            const direction = WorldGeometry.flatUnit(aim(action), WorldCombat.point(0, 0, 1));
            const struck: string[] = [];
            // 接触尝试数与成功数分开：`pierce` 限制接触次数，`landed`／`broken` 只记真正发生的事。
            let travelled = 0, contacts = 0, landed = 0, broken = 0, settled = false;

            function headData(at: CombatPoint, drillPoint: CombatPoint, intensityValue: number): any {
                return { moment: "head", at: [at.x(), at.y(), at.z()], head: [drillPoint.x(), drillPoint.y(), drillPoint.z()],
                    direction: [direction.x(), 0, direction.z()], grains: grains, scale: scale, intensity: intensityValue };
            }
            /** 短钻头贴当前身体前缘：每刻按真实身体位置重发，转速/亮度读威力。 */
            function showHead(current: CombatAction, at: CombatPoint, intensityValue: number): void {
                heads.show(current, "head", at, headData(at, at.plus(direction.scale(radius * 0.9)), intensityValue));
            }

            /** 收势于真实停点：有实际效果（凿盾或伤害）就 skid，一路空钻就 miss。 */
            function finish(current: CombatAction, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), scored = landed + broken;
                WorldFeedback.emit(scope, hyperdrillScene, 1, at,
                    { moment: scored > 0 ? "skid" : "miss", target: "", landed: landed, broken: broken, contacts: contacts,
                        grains: grains, scale: scale, intensity: Math.max(0.6, Math.min(2.3, drill / 90)) }, 22);
                if (scored === 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), hyperdrillMissText, [], 20);
                heads.stop(current);
                movementScenes.finish(current, done);
            }

            function stopPoint(scope: CombatWorld, fallback: CombatPoint): CombatPoint {
                const self = scope.observe(actor);
                return self !== null ? self.position() : fallback;
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                if (travelled >= reach) { finish(current, stopPoint(scope, here)); return; }
                const delta = direction.scale(Math.min(rush, reach - travelled));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                const intensityValue = Math.max(0.6, Math.min(2.3, drill / 90));
                if (hit.hitEntity()) {
                    const victim = hit.target(), at = hit.position();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)
                        && struck.indexOf(String(victim.ref())) < 0) {
                        struck.push(String(victim.ref()));
                        // 真实首接触点：先凿守护，再结算这一记；拆盾与伤害各发各的回执。
                        const layers = hyperdrillShred(scope, victim, shred);
                        const actualPush = p("hyperdrill", "push", withTarget(factContext(current), victim));
                        const struckHome = hurt(current, victim, "hyperdrill", drill,
                            { damage: damageSpec("hyperdrill", "drill"), contact: true });
                        if (layers > 0) {
                            broken += layers;
                            WorldFeedback.emit(scope, hyperdrillScene, 1, at,
                                { moment: "bore", target: String(victim.ref()), broken: layers,
                                    grains: grains, scale: scale, intensity: intensityValue }, 26);
                            sound(current, "minecraft:block.glass.break");
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), hyperdrillBoreText, [layers], 28);
                        }
                        if (struckHome) {
                            landed++;
                            WorldFeedback.emit(scope, hyperdrillScene, 1, at,
                                { moment: "drill", target: String(victim.ref()), grains: grains, scale: scale, intensity: intensityValue }, 22);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), hyperdrillDrillText, [], 22);
                        }
                        if (struckHome || layers > 0) sound(current, "cobblemon:impact.steel");
                        // 只有真的推过才知道推不动：没落伤害不算「推不动」，继续把这一钻用完。
                        let shoved = -1;
                        if (struckHome && scope.valid(victim)) shoved = scope.hitDisplace(victim, direction.scale(actualPush));
                        contacts++;
                        if (contacts >= pierce) { finish(current, stopPoint(scope, at)); return; }
                        if (shoved >= 0 && shoved <= 0.01) { finish(current, stopPoint(scope, at)); return; }
                    } else {
                        // 撞到友方或已经钻过的目标：停在真实接触点，不重复结算。
                        finish(current, stopPoint(scope, at)); return;
                    }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                showHead(current, stopPoint(scope, here), intensityValue);
                movementScenes.show(current, "spin", stopPoint(scope, here),
                    { moment: "spin", direction: [direction.x(), 0, direction.z()], grains: grains, scale: scale, intensity: intensityValue });
                if (hit.blocked() || moved < minimumMove || travelled >= reach) { finish(current, stopPoint(scope, here)); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:block.grindstone.use");
            const startIntensity = Math.max(0.6, Math.min(2.3, drill / 90));
            movementScenes.show(action, "charge", origin, { moment: "charge", direction: [direction.x(), 0, direction.z()], grains: grains, scale: scale,
                    intensity: startIntensity });
            showHead(action, origin, startIntensity);
            advance(action);
        }
    });
}
