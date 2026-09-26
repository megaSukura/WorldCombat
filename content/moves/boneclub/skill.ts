/**
 * 骨棒 / boneclub 的出手方式。
 *
 * 核心念头：抡起手里的骨头当棍子——骨头比身体够得远。直刺沿锁定方向一次够人，窄而单发更高；横扫在 6 刻里
 * 由左至右划过一道骨棒弧，宽而每人更轻；被扫中的目标各吃一记不接触的重击，偶尔被敲懵。命中只有 85，抡偏是常事：
 * 共享的命中偏角让骨头的方向真的会歪。它是畏缩家族里唯一用武器够得更远、也是唯一会真的打偏的一式。
 *
 * 三幕：
 *   起（raise，提交前）：举棍、转腰，棍影在身侧扫开的预告。
 *   挥（thrust / club+arc → hit / wall / miss）：提交后沿命中偏角修正过的方向踏近一小步；
 *       直刺一次从握点到棒头 trace 一条窄长线；横扫每刻从握点到当刻棒头 trace，累计每个敌人只结算一次（最多 maxTargets 人），
 *       按 staggerChance 掷畏缩。真实墙面在碰到它的当刻截断骨棒，伤害不越墙。
 *   果（hit / wall / miss）：命中浮字并闪碎骨屑；撞墙在真实方块接触位置闪碎屑；什么都没碰到只在棒端散一小撮尘。
 *
 * 与同族分开：暗影之骨把骨头掷出去、碎岩/铁尾是贴身打击；只有骨棒把骨头握在手里、够得更远。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `sweep`（横扫式）由 resolve 改时序、由公式改宽度与威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const boneclubScene = "world_combat:move_boneclub";
    const boneclubFlinchEffect = "world_combat:boneclub_flinch";
    const boneclubHitText = "world_combat.move.boneclub.text.hit";
    const boneclubFlinchText = "world_combat.move.boneclub.text.flinch";
    const boneclubWallText = "world_combat.move.boneclub.text.wall";
    const boneclubMissText = "world_combat.move.boneclub.text.miss";

    function boneclubFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, boneclubFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 骨棒当刻端点：握点朝方向转 `angle` 弧度、伸出 `reach`。 */
    function boneclubHead(grip: CombatPoint, heading: CombatPoint, angle: number, reach: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const dir = WorldCombat.point(heading.x() * cos - heading.z() * sin, 0, heading.x() * sin + heading.z() * cos);
        return grip.plus(dir.scale(reach));
    }
    /** 两点间的真实武器长轴（握点 ↔ 当刻端点）。 */
    function boneclubPath(a: CombatPoint, b: CombatPoint): number[][] {
        return [[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()]];
    }
    /** 横扫已划过的端点序列，用来拼出真实轨迹组成的弧。 */
    function boneclubPoints(points: CombatPoint[]): number[][] {
        return points.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        freeMovement: true,
        id: "boneclub",
        cooldownParameter: "recharge",
        name: "Bone Club",
        description: "抡起手里的骨头当棍子：骨头比身体够得远，直刺沿锁定方向一次够人，横扫则由左至右划过一道骨棒弧；被扫中的人各吃一记不接触重击、偶尔被敲懵，同一次挥击里同一目标只结算一次。命中只有 85，抡偏是常事，真实墙面会截断骨棒，抡空就在墙上磕出碎屑。",
        uses: ["用比身体更长的骨头先手够到一个目标", "一次横扫兜住并肩的两三个人", "在对手还没贴上来时敲懵它"],
        kind: "aim",
        range: 3.2,
        maxRange: 4.4,
        prepare: 8,
        active: 24,
        recover: 9,
        cooldown: 22,
        style: "swing",
        defaults: { sweep: false, ai: { maxChase: 8, spacing: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("boneclub", "reach", pokemon) : 3.2, geometry: "line", style: "swing",
                color: 0xC8B48E, label: config && config.sweep === true ? "横扫" : "直刺" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["boneclub"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("boneclub", "tempo", context)),
                recover: Math.round(p("boneclub", "aftercast", context)),
                cooldown: Math.round(p("boneclub", "recharge", context)),
                active: skills["boneclub"].active,
                range: p("boneclub", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:boneclub:" + action.id(), boneclubScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", sweep: config && config.sweep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const sweep = config && config.sweep === true;
            const reach = p("boneclub", "reach", action);
            const gauge = p("boneclub", "gauge", action);
            const power = p("boneclub", "club", action);
            const step = p("boneclub", "step", action);
            const chance = p("boneclub", "staggerChance", action);
            const flinchTicks = Math.round(p("boneclub", "staggerTicks", action));
            const cap = Math.max(1, Math.round(p("boneclub", "maxTargets", action)));
            const sweepTicks = Math.max(2, Math.round(p("boneclub", "sweepTicks", action)));
            const arcDegrees = Math.min(300, Math.max(20, p("boneclub", "arcDegrees", action)));
            // 命中 85：共享偏角让骨头的方向真的会歪。刺随释放方向锁定，横扫沿该方向扇面，都不追目标转弯。
            const direction = NativeSemantics.aim(action, move, aim(action), 1.4);
            const heading = WorldGeometry.flatUnit(direction, WorldCombat.point(0, 0, 1));
            const clubs = Math.max(8, Math.round(power * 0.16));
            const scale = gauge / 0.5;
            const selfRef = String(actor.ref());
            const hitRefs: { [ref: string]: boolean } = {};
            const scene = WorldFeedback.actionScenes(boneclubScene);
            let hits = 0, first: CombatPoint | null = null, settled = false, walled = false;

            // 可选前踏小步：真实碰撞限制，不追踪目标、不冲刺。
            if (step > 0.05) LivingActions.step(world, actor, heading.scale(step));
            const moved = world.observe(actor);
            const base = moved !== null ? moved.position() : action.origin();
            const grip = base.plus(WorldCombat.point(0, 0.55, 0));

            /** 从握点到当刻棒头做一次真实判定；先碰墙就截断，同一目标每次挥击只结算一次。 */
            function swingTick(current: CombatAction, head: CombatPoint): void {
                const scope = current.world();
                const contact = current.trace(grip, head, gauge, true);
                const at = contact.position();
                if (contact.blocked() && !contact.hitEntity()) {
                    const wall = contact.blockPosition() || at;
                    WorldFeedback.emit(scope, boneclubScene, 1, wall,
                        { moment: "wall", face: contact.blockFace(), scale: scale, clubs: clubs }, 20);
                    sound(current, "minecraft:block.bone_block.break");
                    if (!walled) { walled = true; WorldFeedback.text(scope, wall.plus(WorldCombat.point(0, 0.9, 0)), boneclubWallText, [], 20); }
                    return;
                }
                const target = contact.hitEntity() ? contact.target() : null;
                if (target === null || String(target.ref()) === selfRef || scope.friendly(target)) return;
                const ref = String(target.ref());
                if (hitRefs[ref] || hits >= cap) return;
                if (!hurt(current, target, "boneclub", power, { damage: damageSpec("boneclub", "club") })) return;
                hitRefs[ref] = true;
                hits++;
                const body = scope.observe(target);
                const point = body === null ? at : body.position();
                if (first === null) first = point;
                WorldFeedback.emit(scope, boneclubScene, 1, point,
                    { moment: "hit", target: ref, scale: scale, clubs: clubs }, 22);
                sound(current, "cobblemon:impact.ground");
                if (scope.valid(target) && scope.random() < chance && boneclubFlinch(scope, target, flinchTicks)) {
                    WorldFeedback.emit(scope, boneclubScene, 1, point, { moment: "flinch", target: ref }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), boneclubFlinchText, [], 22);
                }
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (hits > 0) {
                    WorldFeedback.text(scope, (first !== null ? first : grip).plus(WorldCombat.point(0, 1.2, 0)), boneclubHitText, [hits], 22);
                } else if (!walled) {
                    // 空抡：只在棒端散一小撮尘，不改地面。
                    WorldFeedback.emit(scope, boneclubScene, 1, grip, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, grip.plus(WorldCombat.point(0, 1.0, 0)), boneclubMissText, [], 20);
                }
                scene.finish(current, done);
            }

            if (!sweep) {
                // 直刺：一次窄长的真实武器线，随释放方向锁定，墙会截断。
                const end = grip.plus(heading.scale(reach));
                WorldFeedback.emit(world, boneclubScene, 1, grip,
                    { moment: "thrust", path: boneclubPath(grip, end), direction: [heading.x(), 0, heading.z()],
                        reach: Math.round(reach * 10) / 10, gauge: Math.round(gauge * 100) / 100, scale: scale, clubs: clubs }, 22);
                sound(action, "minecraft:entity.player.attack.sweep");
                swingTick(action, end);
                finish(action);
                return;
            }

            // 横扫：sweepTicks 刻里由左至右划过一道真实的骨棒弧，每刻从握点到当刻棒头判定。
            const half = arcDegrees * Math.PI / 360;
            const arc: CombatPoint[] = [];
            let tick = 0;
            function swing(current: CombatAction): void {
                const progress = sweepTicks <= 1 ? 1 : tick / (sweepTicks - 1);
                const head = boneclubHead(grip, heading, -half + 2 * half * progress, reach);
                arc.push(head);
                scene.show(current, "club", grip,
                    { moment: "club", path: boneclubPath(grip, head), direction: [heading.x(), 0, heading.z()], scale: scale, clubs: clubs });
                scene.show(current, "arc", grip,
                    { moment: "arc", path: boneclubPoints(arc), scale: scale, clubs: clubs });
                if (tick === 0) sound(current, "minecraft:entity.player.attack.sweep");
                swingTick(current, head);
                tick++;
                if (tick >= sweepTicks) { finish(current); return; }
                current.after(1, function (next: CombatAction) { swing(next); });
            }
            swing(action);
        }
    });

}
