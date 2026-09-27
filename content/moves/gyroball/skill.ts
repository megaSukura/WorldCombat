/**
 * 陀螺球 / gyroball 的出手方式。
 *
 * 核心念头：站定把自己旋成一枚沉重的钢陀螺，把「对手比自己快多少」拧进转速里，转够了再短促地撞上去；
 *   对手越快，这一撞越沉、轮缘转得越急越亮。燃料是「慢」，所以慢的个体才把它用成重锤。
 *
 * 两幕：
 *   起（windup，提交前）：原地旋起来——脚边一圈钢屑向里收、轮缘亮起；`load`（速度差）越大转得越急。
 *   滚（execute，提交后）：沿瞄准方向垫前 `lunge` 格，轮缘扫过一条短走廊；撞上首个非友方即按 `roll`
 *       结算接触伤害、沿方向顶开 `push` 格；撞空则滚到尽头收势。撞击那一下迸出的钢屑量由 `grains` 定。
 *
 * 与同族分开：电球是这台秤的反方向（自己比对手快、远投电团）；滚动系列靠跨出手变重或吃场地区分。
 *   陀螺球只在原地转满一圈、由双方速度差决定分量，是唯一的「以慢为燃料的贴身钢球」。
 *
 * 提交后才触碰世界；准备期只 present。
 */
namespace PokemonSkills {
    /** 一趟滚击扫过的走廊四角：origin 起、朝 direction 长 length、半宽 half；判定与表现共用。 */
    function gyroballLane(origin: CombatPoint, direction: CombatPoint, length: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(length));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 轮缘转速（度/刻）：载荷越高转得越急，服务端算好交给表现。 */
    function gyroballSpin(load: number): number { return 14 + load * 22; }
    /** 绕身轮缘的表现载荷：尺寸用实际判定半径，转速/亮度用载荷；每刻在真实身体位置重发。 */
    function gyroballShell(at: CombatPoint, load: number, radius: number, power: number, active = true): any {
        return { moment: "shell", at: [at.x(), at.y(), at.z()], load: Math.round(load * 100) / 100, radius: radius,
            spin: gyroballSpin(load), intensity: Math.max(0.6, Math.min(2.3, power / 70)), active: active ? 1 : 0 };
    }

    define({
        freeMovement: true,
        id: gyroballId,
        cooldownParameter: "recharge",
        name: "Gyro Ball",
        description: "站定把自己旋成一枚沉重的钢陀螺，把「对手比自己快多少」拧进转速，再短促地撞上去：对手越快，这一撞越沉、画面里的轮缘转得越急越亮。慢的个体才把它用成重锤。可以瞄敌人，也可以朝任意方向或落点短冲——没点敌人时照样撞上路径里实际碰到的第一个非友方，谁挡在路上就按谁的速度结算；没碰到就滚到尽头或撞墙收势。",
        uses: ["对手比自己快时的一记重撞", "贴身在原地转满再短促撞出", "用速度差把轮缘转得更急更亮", "朝空方向或落点短冲试探"],
        kind: "aim",
        range: 3.0,
        maxRange: 5.2,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "charge",
        defaults: { brace: false, ai: { maxChase: 7 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(gyroballId, "lunge", pokemon) + 0.6, geometry: "line", style: "charge", color: 0xB8BEC8,
                label: config && config.brace === true ? "定桩·陀螺球" : "陀螺球" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[gyroballId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(gyroballId, "tempo", context)),
                recover: Math.round(p(gyroballId, "recover", context)),
                cooldown: Math.round(p(gyroballId, "recharge", context)),
                active: 0,
                range: p(gyroballId, "lunge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            const load = p(gyroballId, "load", action);
            const radius = p(gyroballId, "collisionRadius", action);
            const power = p(gyroballId, "roll", action);
            const scale = Math.max(0.65, Math.min(2.3, 0.65 + load * 0.28));
            action.present("gyroball:spin", gyroballScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", load: load, radius: radius, scale: scale,
                    spin: gyroballSpin(load), windup: prepare, brace: config && config.brace === true }));
            const shells = WorldFeedback.actionScenes(gyroballShellScene);
            shells.show(action, "shell", action.origin(), gyroballShell(action.origin(), load, radius, power));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(gyroballScene);
            const shells = WorldFeedback.actionScenes(gyroballShellScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const load = p(gyroballId, "load", action);
            const length = p(gyroballId, "lunge", action);
            const step = p(gyroballId, "rush", action);
            const radius = p(gyroballId, "collisionRadius", action);
            const power = p(gyroballId, "roll", action);
            const push = p(gyroballId, "push", action);
            const grains = Math.max(8, Math.round(p(gyroballId, "grains", action)));
            const scale = Math.max(0.65, Math.min(2.3, 0.65 + load * 0.28));
            const intensity = Math.max(0.6, Math.min(2.3, power / 70));
            // aim 接受任意阵营实体或世界点：实体用于估算速度比，点/方向则直接当滚向；没有目标也不另找替代。
            const aimed = aim(action);
            let direction = WorldCombat.point(aimed.x(), 0, aimed.z());
            direction = direction.length() < 0.05 ? WorldCombat.point(0, 0, 1) : direction.unit();
            let travelled = 0, settled = false;

            movementScenes.show(action, "roll", origin, { moment: "roll", load: Math.round(load * 100) / 100, scale: scale, radius: radius, spin: gyroballSpin(load), grains: grains, intensity: intensity,
                    direction: [direction.x(), direction.y(), direction.z()],
                    path: gyroballLane(origin, direction, length + radius, radius) });
            shells.show(action, "shell", origin, gyroballShell(origin, load, radius, power));
            sound(action, "minecraft:block.grindstone.use");

            function finish(current: CombatAction): void { if (!settled) { settled = true; shells.stop(current); movementScenes.finish(current, done); } }

            /** 空转收势；被墙挡住在真实方块面收，没撞到就在停顿处收。 */
            function whiff(current: CombatAction, at: CombatPoint, wall: CombatImpact | null): void {
                const scope = current.world();
                WorldFeedback.emit(scope, gyroballScene, 1, at, { moment: "whiff", radius: radius, scale: scale, load: Math.round(load * 100) / 100,
                    wall: wall !== null && wall.blocked() ? 1 : 0,
                    face: wall !== null && wall.blocked() ? wall.blockFace() : "" }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), gyroballMissText, [], 20);
                sound(current, "minecraft:block.anvil.land");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const here = current.origin();
                const remaining = length - travelled;
                if (remaining <= 0.02) { whiff(current, here, null); return; }
                const delta = direction.scale(Math.min(step, remaining));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const struck = hit.target(), at = hit.position();
                    // 命中按实际被撞者重算速度比：插队的人用什么速度，这一撞就按什么速度结算。
                    const actual = struck !== null ? withTarget(factContext(current), struck) : null;
                    const actualLoad = actual !== null ? p(gyroballId, "load", actual) : load;
                    const actualPower = actual !== null ? p(gyroballId, "roll", actual) : power;
                    const actualScale = Math.max(0.65, Math.min(2.3, 0.65 + actualLoad * 0.28));
                    const actualIntensity = Math.max(0.6, Math.min(2.3, actualPower / 70));
                    const landed = struck !== null && impact(current, hit, gyroballId, actualPower,
                        { damage: damageSpec(gyroballId, "roll"), contact: true });
                    shells.show(current, "shell", at, gyroballShell(at, actualLoad, radius, actualPower, false));
                    WorldFeedback.emit(scope, gyroballScene, 1, at,
                        { moment: "hit", target: struck ? String(struck.ref()) : "", radius: radius, scale: actualScale,
                            load: Math.round(actualLoad * 100) / 100, grains: grains, intensity: actualIntensity }, 26);
                    if (landed && struck !== null && scope.valid(struck)) {
                        scope.hitDisplace(struck, direction.scale(push));
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), gyroballHitText, [Math.round(actualPower)], 24);
                        if (actualLoad >= 1.5) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.45, 0)), gyroballSpinText, [], 24);
                    }
                    sound(current, "cobblemon:impact.steel");
                    finish(current);
                    return;
                }
                travelled += swept.moved;
                if (hit.blocked()) {
                    whiff(current, hit.blockPosition() === null ? hit.position() : hit.blockPosition()!, hit);
                    return;
                }
                if (swept.moved < p(gyroballId, "minimumMove", current) || travelled >= length) {
                    whiff(current, current.origin(), null);
                    return;
                }
                shells.show(current, "shell", current.origin(), gyroballShell(current.origin(), load, radius, power));
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
