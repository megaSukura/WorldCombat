/**
 * 陀螺球 / gyroball 的出手方式。
 *
 * 核心念头：站定把自己旋成一枚沉重的钢陀螺，把「对手比自己快多少」拧进转速里，转够了再短促地撞上去；
 *   对手越快，这一撞越沉、陀螺也越大。燃料是「慢」，所以慢的个体才把它用成重锤。
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

    define({
        freeMovement: true,
        id: gyroballId,
        cooldownParameter: "recharge",
        name: "Gyro Ball",
        description: "站定把自己旋成一枚沉重的钢陀螺，把「对手比自己快多少」拧进转速，再短促地撞上去：对手越快，这一撞越沉、画面里的陀螺越大。慢的个体才把它用成重锤。",
        uses: ["对手比自己快时的一记重撞", "贴身在原地转满再短促撞出", "用速度差把画面里的陀螺越转越大"],
        kind: "enemy",
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
            action.present("gyroball:spin", gyroballScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", load: p(gyroballId, "load", action), windup: prepare,
                    brace: config && config.brace === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const target = action.target();
            const victim = target !== null && world.valid(target) ? world.observe(target) : null;
            const load = p(gyroballId, "load", action);
            const length = p(gyroballId, "lunge", action);
            const step = p(gyroballId, "rush", action);
            const radius = p(gyroballId, "collisionRadius", action);
            const power = p(gyroballId, "roll", action);
            const push = p(gyroballId, "push", action);
            const grains = Math.max(8, Math.round(p(gyroballId, "grains", action)));
            const traceAhead = p(gyroballId, "traceAhead", action);
            const scale = Math.max(0.65, Math.min(2.3, 0.65 + load * 0.28));
            const intensity = Math.max(0.6, Math.min(2.3, power / 70));
            let direction = victim !== null
                ? WorldCombat.point(victim.position().x() - origin.x(), 0, victim.position().z() - origin.z())
                : WorldCombat.point(action.direction().x(), 0, action.direction().z());
            if (direction.length() < 0.05) direction = WorldCombat.point(0, 0, 1);
            direction = direction.unit();
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, gyroballScene, 1, origin,
                { moment: "roll", load: Math.round(load * 100) / 100, scale: scale, grains: grains, intensity: intensity,
                    direction: [direction.x(), direction.y(), direction.z()],
                    path: gyroballLane(origin, direction, length + radius, radius) }, 46);
            sound(action, "minecraft:block.grindstone.use");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, gyroballScene, 1, at, { moment: "whiff", scale: scale, load: Math.round(load * 100) / 100 }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), gyroballMissText, [], 20);
                sound(current, "minecraft:block.anvil.land");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const here = current.origin();
                const remaining = length - travelled;
                if (remaining <= 0.02) { whiff(current, here); return; }
                const delta = direction.scale(Math.min(step, remaining));
                const hit = current.trace(here, here.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    const struck = hit.target(), at = hit.position();
                    const landed = struck !== null && impact(current, hit, gyroballId, power,
                        { damage: damageSpec(gyroballId, "roll"), contact: true });
                    WorldFeedback.emit(scope, gyroballScene, 1, at,
                        { moment: "hit", target: struck ? String(struck.ref()) : "", scale: scale,
                            load: Math.round(load * 100) / 100, grains: grains, intensity: intensity }, 26);
                    if (landed && struck !== null && scope.valid(struck)) {
                        scope.displace(struck, direction.scale(push));
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), gyroballHitText, [Math.round(power)], 24);
                        if (load >= 1.5) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.45, 0)), gyroballSpinText, [], 24);
                    }
                    sound(current, "cobblemon:impact.steel");
                    finish(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(gyroballId, "minimumMove", current) || travelled >= length) {
                    whiff(current, here.plus(delta));
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
