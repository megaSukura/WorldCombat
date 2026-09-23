/**
 * 强力钻 / hyperdrill 的出手方式。
 *
 * 核心念头：把身体最尖的一点高速旋成钻头，沿着瞄准方向一路凿穿——它不在乎对手撑了什么，先把挡在前面的
 *   守护整层凿开，再按这一记的重力砸进去；贯穿式会一路钻过多个目标。
 *
 * 三幕（提交前只播预告）：
 *   旋（wind，提交前）：压低身子、尖端旋起来，只播一记预告。
 *   钻（charge → bore）：提交后朝瞄准方向冲 `reach` 格（每刻 `rush`）；每碰上一个新目标，先凿掉它最多
 *       `shred` 层守护（`world_combat:guard` 的 dispel），再按 `drill` 结算接触伤害并把它顶开 `push`。
 *       贯穿式最多钻穿 `pierce` 个目标后收势，定钻式钻到第一个就收；撞墙或冲满射程也收。
 *   收（skid）。
 *
 * 与同族分开：佯攻先掀后戳、快而轻；强力钻连撕带砸、慢而猛，是一条直线的凿穿。守护是共享机制 GuardEffects，
 *   所以对宝可梦、原版生物、其他模组生物和玩家一视同仁。
 *
 * 配置 `through` 由公式改威力／射程／冲速／贯穿人数与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const hyperdrillScene = "world_combat:move_hyperdrill";
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
        id: "hyperdrill",
        cooldownParameter: "recharge",
        name: "Hyper Drill",
        description: "把身体最尖的一点高速旋成钻头，沿着瞄准方向一路凿穿：先把挡在前面的守护整层凿开，再按这一记的重力砸进去并把目标顶开。贯穿式会一路钻过多个目标。",
        uses: ["凿穿着了守护的目标强行打进去", "沿一条线一次穿过排在一起的几个敌人", "用高额的接触伤害收掉一个挡在前面的人"],
        kind: "enemy",
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
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const body = world.observe(actor);
            const origin = body !== null ? body.position() : action.origin();
            const victimBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const reach = Math.max(1.6, p("hyperdrill", "reach", action));
            const rush = Math.max(0.25, p("hyperdrill", "rush", action));
            const radius = Math.max(0.36, p("hyperdrill", "radius", action));
            const drill = p("hyperdrill", "drill", action);
            const shred = Math.max(1, Math.round(p("hyperdrill", "shred", action)));
            const pierce = Math.max(1, Math.round(p("hyperdrill", "pierce", action)));
            const push = p("hyperdrill", "push", action);
            const grains = Math.max(8, Math.round(p("hyperdrill", "grains", action)));
            const scale = radius / hyperdrillReferenceRadius;
            const minimumMove = 0.03;
            let direction = victimBody !== null
                ? WorldCombat.point(victimBody.position().x() - origin.x(), 0, victimBody.position().z() - origin.z())
                : WorldCombat.point(action.direction().x(), 0, action.direction().z());
            if (direction.length() < 0.05) direction = WorldCombat.point(0, 0, 1);
            direction = direction.unit();
            const struck: string[] = [];
            let travelled = 0, strikes = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), where = (scope.observe(actor) || body)!.position();
                WorldFeedback.emit(scope, hyperdrillScene, 1, where,
                    { moment: strikes > 0 ? "skid" : "miss", target: "", landed: strikes > 0 ? 1 : 0,
                        strikes: strikes, grains: grains, scale: scale, intensity: Math.max(0.6, Math.min(2.3, drill / 90)) }, 22);
                if (strikes === 0)
                    WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.0, 0)), hyperdrillMissText, [], 20);
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                if (travelled >= reach) { finish(current); return; }
                const delta = direction.scale(Math.min(rush, reach - travelled));
                const hit = current.trace(here, here.plus(delta.scale(1.3)), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target(), at = hit.position();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)
                        && struck.indexOf(String(victim.ref())) < 0) {
                        struck.push(String(victim.ref()));
                        const broken = hyperdrillShred(scope, victim, shred);
                        const landed = hurt(current, victim, "hyperdrill", drill,
                            { damage: damageSpec("hyperdrill", "drill"), contact: true });
                        WorldFeedback.emit(scope, hyperdrillScene, 1, at,
                            { moment: broken > 0 ? "bore" : "drill", target: String(victim.ref()), broken: broken,
                                grains: grains, scale: scale, intensity: Math.max(0.6, Math.min(2.3, drill / 90)) }, 26);
                        if (broken > 0) {
                            sound(current, "minecraft:block.glass.break");
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.25, 0)), hyperdrillBoreText, [broken], 28);
                        } else if (landed) {
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), hyperdrillDrillText, [], 22);
                        }
                        if (landed && scope.valid(victim)) scope.displace(victim, direction.scale(push));
                        sound(current, "cobblemon:impact.steel");
                        strikes++;
                        if (strikes >= pierce) { finish(current); return; }
                    }
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                WorldFeedback.keep(scope, "hyperdrill:drill:" + String(current.actor().ref()), hyperdrillScene, 1, here,
                    { moment: "spin", direction: [direction.x(), 0, direction.z()], grains: grains, scale: scale,
                        intensity: Math.max(0.6, Math.min(2.3, drill / 90)) }, 8);
                if (hit.blocked() || moved < minimumMove || travelled >= reach) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            sound(action, "minecraft:block.grindstone.use");
            WorldFeedback.emit(world, hyperdrillScene, 1, origin,
                { moment: "charge", direction: [direction.x(), 0, direction.z()], grains: grains, scale: scale,
                    intensity: Math.max(0.6, Math.min(2.3, drill / 90)) }, 18);
            advance(action);
        }
    });
}
