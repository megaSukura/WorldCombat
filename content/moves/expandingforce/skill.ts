/**
 * 广域战力 / expandingforce —— 注册与动作。
 *
 * 一幕蓄力（提交前 `windup` 在真正的选定点按真正的分支播预告），一幕发力（提交后以同一选定点为中心，
 * 把精神冲击的波前沿用 6 刻由内向外分段推出，每名敌人只挨一次）。
 *
 * 「是不是增强分支」以释放时的实际事实判断，单元内共用同一函数（action 与 AI 都调用）：
 *   取施法者真实碰撞箱底（`boundsMin`，大型身体的中心偏高也不影响），要求落点水平距离在该场地半径内、
 *   与场地同层（`EXPANDINGFORCE_LAYER` 内）、从场地中心到脚下有可见视线，且那片场不是 pending 预约。
 *   只读被实际识别的这一片场地；本招**不消耗**它。友方与敌方铺的精神场地都可以借。
 *
 * kind 为 point：选一块地面/空地，实体只是它的建议落点；方块遮挡与落点检查沿现有规则，不强制锁敌。
 * 普通分支用较小的 `radius`；真实踩在有效精神场地上时用 `burst` 半径并把威力 ×1.5（`empower`）。
 * 两种分支都不铺场、不减速、不消耗既有场地。
 */
namespace PokemonSkills {
    /** 同层判定：脚底与场地平面的最大高度差；比一层楼小，能容忍台阶，不会跨层误判。 */
    export const EXPANDINGFORCE_LAYER = 1.5;
    /** 波前扩展的可读时长：6 刻内由中心推到边缘。 */
    const EXPANDINGFORCE_WAVE_TICKS = 6;
    const EXPANDINGFORCE_NORMAL_TEXT = "world_combat.move.expandingforce.text.normal";
    const EXPANDINGFORCE_EMPOWERED_TEXT = "world_combat.move.expandingforce.text.empowered";

    /** 施法者真实脚底（碰撞箱底面的水平中心），不取偏高的身体中心。 */
    export function expandingforceFoot(body: CombatObservation): CombatPoint {
        var min = body.boundsMin(), max = body.boundsMax();
        return WorldCombat.point((min.x() + max.x()) / 2, min.y(), (min.z() + max.z()) / 2);
    }

    /** 脚下这一片被实际识别的精神场地：非 pending 预约、同层、水平在半径内、从场心可见；否则 null。 */
    export function expandingforceFieldAt(world: CombatWorld, foot: CombatPoint): WorldEffects.Area | null {
        var areas = WorldEffects.areas(world, EXPANDINGFORCE_IDENTITY);
        for (var i = 0; i < areas.length; i++) {
            var area = areas[i];
            if (area.pending)
                continue;
            var dx = area.position[0] - foot.x(), dz = area.position[2] - foot.z();
            if (Math.sqrt(dx * dx + dz * dz) > area.radius)
                continue;
            if (Math.abs(foot.y() - area.position[1]) > EXPANDINGFORCE_LAYER)
                continue;
            if (!world.clear(WorldCombat.point(area.position[0], area.position[1], area.position[2]), foot))
                continue;
            return area;
        }
        return null;
    }

    /** 这一次真正的分支与它的真实点/半径/威力：都以选定点为中心，只有半径与威力随脚下场地变化。 */
    function expandingforceBranch(action: CombatAction): { empowered: boolean; point: CombatPoint; radius: number; power: number } {
        var sense = action.sense(), body = sense.observe(action.actor());
        var point = WorldGeometry.ground(sense, action.targetPosition());
        var empowered = false;
        if (body && body.grounded())
            empowered = expandingforceFieldAt(sense, expandingforceFoot(body)) !== null;
        var radius = empowered ? p("expandingforce", "burst", action) : p("expandingforce", "radius", action);
        var power = p("expandingforce", "power", action) * (empowered ? p("expandingforce", "empower", action) : 1);
        return { empowered: empowered, point: point, radius: radius, power: power };
    }

    function expandingforcePoint(point: CombatPoint): number[] {
        return [point.x(), point.y(), point.z()];
    }

    /**
     * 以 `point` 为中心把波前沿推出 `radius`：6 刻内每刻只结算当天真实子环带内的敌人，每名敌人一次；
     * 判定与表现共用同一对内外端点（`inner`/`outer`）。判定用真实方块遮挡过滤，命中走共享伤害结算。
     */
    function expandingforceWave(action: CombatAction, plan: { empowered: boolean; point: CombatPoint; radius: number; power: number },
        done: (current: CombatAction) => void): void {
        var point = plan.point, radius = plan.radius, power = plan.power;
        var seen: { [ref: string]: boolean } = Object.create(null);
        var hits = 0, elapsed = 0;
        var scale = radius / 3.0;
        sound(action, "cobblemon:move.psychic.actor");
        function finish(current: CombatAction): void {
            var world = current.world(), body = world.observe(action.actor());
            if (body !== null)
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)),
                    plan.empowered ? EXPANDINGFORCE_EMPOWERED_TEXT : EXPANDINGFORCE_NORMAL_TEXT,
                    [Math.round(power * 10) / 10, hits], 26);
            done(current);
        }
        function step(current: CombatAction): void {
            var scope = current.world();
            elapsed++;
            var inner = radius * (elapsed - 1) / EXPANDINGFORCE_WAVE_TICKS;
            var outer = elapsed >= EXPANDINGFORCE_WAVE_TICKS ? radius + 0.01 : radius * elapsed / EXPANDINGFORCE_WAVE_TICKS;
            WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, inner, outer, { below: 2, above: 3 }), function (enemy: CombatActor, facts: CombatObservation) {
                var ref = String(enemy.ref());
                if (seen[ref]) return;
                if (!scope.clear(point, facts.position())) return;
                seen[ref] = true;
                if (hurt(current, enemy, "expandingforce", power)) hits++;
            });
            var mid = (inner + outer) / 2, width = Math.max(0.15, outer - inner);
            WorldFeedback.emit(scope, EXPANDINGFORCE_SCENE, 1, point,
                { moment: "wave", point: expandingforcePoint(point), front: outer, mid: mid, width: width,
                    count: Math.max(18, Math.round(24 * scale)), radius: radius, scale: scale, empowered: plan.empowered ? 1 : 0,
                    intensity: plan.empowered ? 1.8 : 1.3, step: elapsed, steps: EXPANDINGFORCE_WAVE_TICKS }, 20);
            if (elapsed < EXPANDINGFORCE_WAVE_TICKS) current.after(1, step);
            else finish(current);
        }
        step(action);
    }

    define({ id: "expandingforce", name: "广域战力",
        description: "把精神力量压进所选地面，以落点为中心推出 6 刻内向外扩展的精神冲击，每个敌人只挨一次；不使用、也不消耗任何场地。若释放时脚踏实地站在一片有效精神场地上（敌我铺的都可以），冲击半径更大、威力 ×1.5。",
        uses: ["范围压制", "借精神场地放大冲击"], kind: "point", range: 16, prepare: 10, active: 0, recover: 10, cooldown: 50, style: "psy",
        defaults: {}, fields: [],
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: pokemon ? p("expandingforce", "radius", pokemon) : 1.7, geometry: "area", style: "psy", label: "广域战力" };
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var plan = expandingforceBranch(action);
            action.data("expandingforce/preview", JSON.stringify({ empowered: plan.empowered, radius: plan.radius }));
            action.present("world_combat:expandingforce:" + action.id(), EXPANDINGFORCE_SCENE, 1, plan.point,
                JSON.stringify({ moment: "windup", point: expandingforcePoint(plan.point), radius: plan.radius,
                    empowered: plan.empowered ? 1 : 0, scale: plan.radius / 3.0 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const plan = expandingforceBranch(action);
            const preview = JSON.parse(String(action.data("expandingforce/preview") || "{}"));
            if (preview.empowered !== plan.empowered || preview.radius !== plan.radius) {
                action.present("world_combat:expandingforce:updated", EXPANDINGFORCE_SCENE, 1, plan.point,
                    JSON.stringify({ moment: "windup", point: expandingforcePoint(plan.point), radius: plan.radius,
                        empowered: plan.empowered ? 1 : 0, scale: plan.radius / 3.0 }));
                action.after(6, current => expandingforceWave(current, plan, done));
            } else expandingforceWave(action, plan, done);
        }
    });
}
