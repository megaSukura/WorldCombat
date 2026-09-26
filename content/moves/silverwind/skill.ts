/**
 * 银色旋风 / silverwind —— 注册与动作。
 *
 * 核心念头：抖翅把银鳞扇成一大片向前铺开、缓缓往前飘，站在扇面里的敌人各被割一下；回卷的一撮鳞粉有概率
 *   落在自己身上，把五项战斗能力各抬一级。鳞粉是实物：走得慢、会被掩体挡住，飘完就落。
 *
 * 三幕：
 *   起（gather，提交前）：翅缘亮起银光、鳞粉朝翅上聚，只播预告。
 *   扇（blow → hit）：提交后把 `span` 度、`reach` 远的**三维薄扇**朝瞄准方向铺满鳞粉；扇面与准心平面一致，
 *       因此能仰射空中，也能俯扫脚下。扇内每个非友方各结算一次 `gale` 特殊伤害，命中须过视线检查（墙后的不伤）。
 *       鳞粉在空气里飘 `drift` 秒后落下；这是短余尘，没有第二次伤害或延时补伤。
 *   涌（surge / miss）：扇过之后掷一次反哺，只按本次实际提高的项反馈，窗口保持一层。
 *
 * `kind: "aim"`：可点实体，也可点空中／地面落点；提交不要求存在敌人。
 */
namespace PokemonSkills {
    const silverwindScene = "world_combat:move_silverwind";
    const silverwindSurgeText = "world_combat.move.silverwind.text.surge";
    const silverwindHitText = "world_combat.move.silverwind.text.hit";
    const silverwindMissText = "world_combat.move.silverwind.text.miss";

    /** 面向准心的三维正交架：axis 为前向，normal 为扇面法线，side 为扇面内与 axis 垂直的方向。 */
    function silverwindFrame(forward: CombatPoint): { axis: CombatPoint; normal: CombatPoint; side: CombatPoint } {
        const axis = forward.length() > 1e-6 ? forward.unit() : WorldCombat.point(0, 0, 1);
        const up = Math.abs(axis.y()) < 0.9 ? WorldCombat.point(0, 1, 0) : WorldCombat.point(1, 0, 0);
        const side = WorldCombat.point(axis.y() * up.z() - axis.z() * up.y(), axis.z() * up.x() - axis.x() * up.z(),
            axis.x() * up.y() - axis.y() * up.x()).unit();
        const normal = WorldCombat.point(axis.y() * side.z() - axis.z() * side.y(), axis.z() * side.x() - axis.x() * side.z(),
            axis.x() * side.y() - axis.y() * side.x()).unit();
        return { axis: axis, normal: normal, side: WorldCombat.point(normal.y() * axis.z() - normal.z() * axis.y(),
            normal.z() * axis.x() - normal.x() * axis.z(), normal.x() * axis.y() - normal.y() * axis.x()).unit() };
    }

    /** 与判定同源的扇面区域：前向距离 0..reach、法线厚度 ±halfThickness、面内半角 span/2。 */
    function silverwindRegion(origin: CombatPoint, frame: { axis: CombatPoint; normal: CombatPoint; side: CombatPoint },
        reach: number, span: number, halfThickness: number): WorldGeometry.Region {
        const axis = frame.axis, normal = frame.normal, side = frame.side;
        const cosHalf = Math.cos(Math.min(360, Math.max(0, span)) * Math.PI / 360);
        return {
            contains: function (point) {
                const d = point.minus(origin);
                const along = d.x() * axis.x() + d.y() * axis.y() + d.z() * axis.z();
                if (along < 0 || along > reach) return false;
                const depth = d.x() * normal.x() + d.y() * normal.y() + d.z() * normal.z();
                if (Math.abs(depth) > halfThickness) return false;
                const inPlane = d.minus(normal.scale(depth)), length = inPlane.length();
                if (length < 1e-6) return true;
                return (inPlane.x() * axis.x() + inPlane.y() * axis.y() + inPlane.z() * axis.z()) / length >= cosHalf - 1e-9;
            },
            centre: function () { return origin; },
            radius: function () { return reach + halfThickness + 1; }
        };
    }

    /** 扇面顶点（含圆心），墙面把外缘顶点截在真实碰点；判定与表现读同一组空间参数。 */
    function silverwindFan(world: CombatWorld, origin: CombatPoint, frame: { axis: CombatPoint; normal: CombatPoint; side: CombatPoint },
        reach: number, span: number, steps: number): CombatPoint[] {
        const half = span * Math.PI / 360, vertices: CombatPoint[] = [origin];
        for (let i = 0; i <= steps; i++) {
            const angle = -half + (2 * half) * i / steps;
            const direction = frame.axis.scale(Math.cos(angle)).plus(frame.side.scale(Math.sin(angle)));
            let point = origin.plus(direction.scale(reach));
            const clip = world.clipBlocks(origin, point);
            if (clip !== null && clip.blocked()) point = clip.position();
            vertices.push(point);
        }
        return vertices;
    }

    define({
        id: "silverwind",
        cooldownParameter: "recharge",
        name: "Silver Wind",
        description: "抖翅把银鳞扇成一大片向前铺开：扇面朝向准心所在的平面，可以仰射空中或俯扫脚下；扇面里的敌人各被割一下，墙后的打不到；鳞粉缓缓飘落后散尽，不留延时伤害。回卷的一撮鳞粉有概率把自身五项战斗能力短时各抬一级。浓鳞式短而窄、更重；疏鳞式铺得更远更宽、出手更快。",
        uses: ["一次割到并排站着的几个人", "仰起或压低朝空中/地面的方向先手", "抓住反哺后的短时强化窗口进攻"],
        kind: "aim",
        range: 7.5,
        maxRange: 11,
        prepare: 10,
        active: 0,
        recover: 9,
        cooldown: 30,
        style: "scalewind",
        defaults: { dense: false, ai: { maxChase: 12, preferCrowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("silverwind", "reach", pokemon), geometry: "cone", style: "scalewind", color: 0xC9D8E6,
                label: config && config.dense === true ? "浓鳞式" : "银色旋风" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["silverwind"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("silverwind", "tempo", context)),
                recover: Math.round(p("silverwind", "aftercast", context)),
                cooldown: Math.round(p("silverwind", "recharge", context)),
                active: 0,
                range: p("silverwind", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("silverwind:gather", silverwindScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", reach: p("silverwind", "reach", action),
                    span: p("silverwind", "span", action), dense: config && config.dense === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const direction = aim(action);
            const frame = silverwindFrame(direction);
            const reach = Math.max(4, p("silverwind", "reach", action));
            const span = Math.max(40, p("silverwind", "span", action));
            const power = p("silverwind", "gale", action);
            const chance = Math.max(0.02, Math.min(0.9, p("silverwind", "surgeChance", action)));
            const stages = Math.max(1, Math.round(p("silverwind", "surgeStages", action)));
            const scales = Math.max(16, Math.round(p("silverwind", "scales", action)));
            const drift = Math.max(0.6, p("silverwind", "drift", action));
            const thickness = Math.max(0.7, body.height() * 0.5);
            const fan = silverwindFan(world, origin, frame, reach, span, 8).map(function (point) { return [point.x(), point.y(), point.z()]; });
            const scale = Math.max(0.6, Math.min(2.2, reach / 7.5));
            const intensity = Math.max(0.5, Math.min(2.4, power / 62));
            const life = Math.max(30, Math.round(drift * 20) + 16);

            sound(action, "cobblemon:animation.chitin.wing_flap.medium");
            WorldFeedback.emit(world, silverwindScene, 1, origin,
                { moment: "blow", path: fan, span: span, reach: reach, scales: scales, drift: drift,
                  scale: scale, intensity: intensity }, life);

            let hits = 0;
            WorldGeometry.selectEnemies(world, silverwindRegion(origin, frame, reach, span, thickness),
                function (victim, facts) {
                    if (String(victim.ref()) === String(actor.ref())) return;
                    const point = facts.position();
                    if (!world.clear(origin, point)) return;
                    if (!hurt(action, victim, "silverwind", power, { damage: damageSpec("silverwind", "gale") })) return;
                    hits++;
                    WorldFeedback.emit(world, silverwindScene, 1, point,
                        { moment: "hit", target: String(victim.ref()), scales: scales, scale: scale, intensity: intensity }, 22);
                });

            if (hits === 0) {
                WorldFeedback.text(world, origin.plus(direction.scale(reach * 0.6)).plus(WorldCombat.point(0, 1.0, 0)),
                    silverwindMissText, [], 22);
                WorldFeedback.emit(world, silverwindScene, 1, origin.plus(direction.scale(reach * 0.6)),
                    { moment: "miss", scales: Math.round(scales * 0.5), scale: scale }, 20);
                done(action);
                return;
            }
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), silverwindHitText, [hits], 26);

            if (world.random() < chance && world.valid(actor)) {
                const window = Math.max(1, Math.round(p("silverwind", "surgeTicks", action)));
                const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
                world.effects(actor, definition).forEach(function (view) {
                    const data = JSON.parse(String(view.data()));
                    if (data.source === "world_combat:move/silverwind") NativeEffects.windowClose(world, view.id());
                });
                const before = NativeEffects.effectiveStages(world, actor);
                const windowId = NativeEffects.boostWindow(world, actor, { atk: stages, def: stages, spa: stages, spd: stages, spe: stages },
                    window, "world_combat:move/silverwind");
                if (windowId > 0) {
                    const after = NativeEffects.effectiveStages(world, actor);
                    const rise: any = {};
                    let raised = 0, best = 0;
                    ["atk", "def", "spa", "spd", "spe"].forEach(function (stat) {
                        const gain = Math.max(0, Math.round((after[stat] || 0) - (before[stat] || 0)));
                        if (gain > 0) { rise[stat] = gain; raised++; if (gain > best) best = gain; }
                    });
                    if (raised > 0) {
                        const self = world.observe(actor);
                        const at = self === null ? origin : self.position();
                        WorldFeedback.emit(world, silverwindScene, 1, at,
                            { moment: "surge", target: String(actor.ref()), rise: rise, stages: best, scales: scales, scale: scale }, 26);
                        WorldFeedback.text(world, at.plus(WorldCombat.point(0, self === null ? 1.4 : self.height() + 0.1, 0)),
                            silverwindSurgeText, [raised, best, Math.round(window / 20)], 30);
                        world.sound("minecraft:block.beacon.power_select", at, 18, "{}");
                    }
                }
            }
            done(action);
        }
    });
}
