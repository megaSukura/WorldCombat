/**
 * 疯狂滚压 / steamroller 的出手方式。
 *
 * 核心念头：把自己揉成一团滚出去，从一整排对手身上碾过去——滚到谁身上谁就吃一记压扁式伤害、被推着往前，
 *   还可能被压得一愣；滚过之后地面留下一道被压平的短痕（会自己恢复）。它是本组最便宜、冷却最短的一记，
 *   代价是单发最低、只压得到滚过的那条线。
 *
 * 两幕：
 *   起（windup，提交前）：把身体团成球、脚边一圈尘向内收拢；只播预告，可被打断。
 *   滚（execute，提交后）：沿瞄准方向滚 `lane` 格，每刻把球两侧 `radius` 内的新敌人各结算一次 `squash`
 *       接触伤害、沿滚动方向推 `push` 格并按 `flinchChance` 掷畏缩；滚过处的地面被压平（短命租借，到期恢复）。
 *       撞墙或滚到尽头即收势，没压到人则只在脚边扬尘。
 *
 * 与同族分开：陀螺球只撞第一个、威力随速度差放大；疯狂滚压穿过一整排、威力随体重放大。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 */
namespace PokemonSkills {
    /** 碾压扫过的走廊四个角：origin 起、朝 direction 长 length、半宽 half；判定与表现共用。 */
    function steamrollerLane(origin: CombatPoint, direction: CombatPoint, length: number, half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(1, 0, 0) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(length));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    function steamrollerFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, steamrollerFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 可被压成平痕的表土；石头、木板等保持原样，不新增坑。 */
    function steamrollerSoil(id: string): boolean {
        return ["minecraft:grass_block", "minecraft:dirt", "minecraft:coarse_dirt", "minecraft:rooted_dirt",
            "minecraft:podzol", "minecraft:mycelium", "minecraft:mud", "minecraft:moss_block", "minecraft:farmland"].indexOf(id) >= 0;
    }

    /** 把球脚下最近的表土压成一段平痕；只替换已有表土，横跨 width 格，到期原方块自己回来。 */
    function steamrollerTread(world: CombatWorld, here: CombatPoint, side: CombatPoint, width: number, ticks: number): void {
        for (var dy = 0; dy <= 3; dy++) {
            const probe = here.plus(WorldCombat.point(0, -0.5 - dy, 0));
            const block = world.block(probe);
            if (block === null || String(block.id()) === "minecraft:air") continue;
            if (!steamrollerSoil(String(block.id()))) return;
            const cell = block.position();
            for (var index = 0; index < width; index++) {
                const offset = index - (width - 1) / 2;
                const x = Math.round(cell.x() + side.x() * offset);
                const z = Math.round(cell.z() + side.z() * offset);
                const target = world.block(WorldCombat.point(x, cell.y(), z));
                if (target === null || !steamrollerSoil(String(target.id()))) continue;
                try {
                    world.terrain(JSON.stringify({ cells: [{ x: x, y: cell.y(), z: z, block: "minecraft:dirt_path" }], replace: true, linger: true }), ticks);
                } catch (error) { }
            }
            return;
        }
    }

    define({
        freeMovement: true,
        id: steamrollerId,
        cooldownParameter: "recharge",
        name: "Steamroller",
        description: "把自己揉成一团滚出去，从一整排对手身上碾过去：滚到谁身上谁就吃一记压扁式伤害、被推着往前，还可能被压得一愣。可以朝任意方向滚；沿本体真正滚过的那段路径，碾压半径内的敌人各中一次，撞实体不挡路、撞到实体墙才停。滚过处的表土留下一条会自己恢复的平痕，石头等地形保持原样。是本组最便宜、冷却最短的一记。",
        uses: ["一次碾过一整排敌人", "低消耗低冷却地连续压场", "滚出一条被人踩出来的平痕"],
        kind: "enemy",
        range: 4.0,
        maxRange: 7.6,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "charge",
        defaults: { wide: false, ai: { maxChase: 7, preferRow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(steamrollerId, "lane", pokemon), geometry: "line", style: "charge", color: 0xB6C24A,
                label: config && config.wide === true ? "宽碾滚压" : "疯狂滚压" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[steamrollerId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(steamrollerId, "tempo", context)),
                recover: Math.round(p(steamrollerId, "recover", context)),
                cooldown: Math.round(p(steamrollerId, "recharge", context)),
                active: 0,
                range: p(steamrollerId, "lane", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("steamroller:curl", steamrollerScene, 1, action.origin(),
                JSON.stringify({ moment: "curl", windup: prepare, wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const scenes = WorldFeedback.actionScenes(steamrollerScene);
            const body = world.observe(action.actor());
            const origin = body === null ? action.origin() : body.position();
            const power = p(steamrollerId, "squash", action);
            const length = p(steamrollerId, "lane", action);
            const speed = p(steamrollerId, "rollSpeed", action);
            const radius = p(steamrollerId, "radius", action);
            const chance = p(steamrollerId, "flinchChance", action);
            const flinchTicks = Math.round(p(steamrollerId, "flinchTicks", action));
            const push = p(steamrollerId, "push", action);
            const dirty = Math.max(8, Math.round(p(steamrollerId, "dirt", action)));
            const treadCells = Math.max(1, Math.round(p(steamrollerId, "treadCells", action)));
            const treadTicks = Math.round(p(steamrollerId, "treadTicks", action));
            const scale = Math.max(0.7, Math.min(2.0, radius / 0.5));
            const intensity = Math.max(0.55, Math.min(2.2, power / 66));
            // 自由方向：aim 的方向/落点直接当滚向，空滚也走同一条路。
            const aimed = aim(action);
            let direction = WorldCombat.point(aimed.x(), 0, aimed.z());
            direction = direction.length() < 0.05 ? WorldCombat.point(1, 0, 0) : direction.unit();
            const side = WorldCombat.point(-direction.z(), 0, direction.x());
            // 把设计的总压痕块数摊到这一趟的帧数上，决定每步压多宽的一小段表土。
            const steps = Math.max(1, Math.ceil(length / Math.max(0.05, speed)));
            const treadWidth = Math.max(1, Math.min(3, Math.round(treadCells / steps)));
            let travelled = 0, crushed = 0, settled = false;
            const hitRefs: { [ref: string]: boolean } = {};

            scenes.show(action, "roll", origin, { moment: "roll", scale: scale, dirt: dirty, tread: treadCells, intensity: intensity,
                direction: [direction.x(), direction.y(), direction.z()], path: steamrollerLane(origin, direction, radius, radius) });
            sound(action, "minecraft:entity.ravager.step");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (crushed === 0) {
                    const scope = current.world(), at = current.origin();
                    WorldFeedback.emit(scope, steamrollerScene, 1, at, { moment: "whiff", scale: scale, dirt: dirty }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), steamrollerMissText, [], 20);
                }
                scenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const before = current.origin();
                const remaining = length - travelled;
                if (remaining <= 0.02) { finish(current); return; }
                const delta = direction.scale(Math.min(speed, remaining));
                // 实体墙止步：先探这一小段是否撞到方块；实体接触不算挡路。
                const probe = current.trace(before, before.plus(delta), radius);
                // 本体扫掠：撞实体不挡路、可继续原剩余行程。
                const moved = scope.displace(current.actor(), delta);
                const end = current.origin();
                // 近地覆盖真实移动过的那一段：滚到哪压到哪，而不是预测的整条走廊。
                if (moved > 0.001) {
                    const laneStart = before.minus(direction.scale(radius));
                    WorldGeometry.selectEnemies(scope,
                        WorldGeometry.lane(laneStart, direction, moved + radius * 2, radius + 0.35, { below: 2.2, above: 2.6 }),
                        function (target, facts) {
                            const ref = String(target.ref());
                            if (hitRefs[ref]) return;
                            hitRefs[ref] = true;
                            const landed = hurt(current, target, steamrollerId, power,
                                { damage: damageSpec(steamrollerId, "squash"), contact: true });
                            if (!landed) return;
                            crushed++;
                            if (scope.valid(target)) scope.hitDisplace(target, direction.scale(push));
                            WorldFeedback.emit(scope, steamrollerScene, 1, facts.position(),
                                { moment: "crush", target: ref, dirt: dirty, scale: scale, intensity: intensity }, 24);
                            WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.0, 0)), steamrollerHitText, [Math.round(power)], 22);
                            if (scope.random() < chance && steamrollerFlinch(scope, target, flinchTicks)) {
                                WorldFeedback.emit(scope, steamrollerScene, 1, facts.position(), { moment: "stagger", target: ref }, 22);
                                WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.3, 0)), steamrollerFlinchText, [], 22);
                            }
                        });
                }
                travelled += moved;
                // 平痕跟已走过的那段：只压已有表土，不新增坑。
                steamrollerTread(scope, end, side, treadWidth, treadTicks);
                scenes.show(current, "roll", end, { moment: "roll", scale: scale, dirt: dirty, tread: treadCells, intensity: intensity,
                    direction: [direction.x(), direction.y(), direction.z()], path: steamrollerLane(origin, direction, travelled + radius, radius) });
                if (probe.blocked() || moved < p(steamrollerId, "minimumMove", current) || travelled >= length) {
                    finish(current);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });

}
