/**
 * 炼狱 / inferno 的出手方式。
 *
 * 核心念头：在落点的地面埋下一枚火印——先是一圈焦黑的热痕闷响预热，随后烈焰从地里涌起、向上卷成一根
 *   把里面整个包住的火柱；被卷到的一刻必定灼伤。原生 50% 的命中就是这段看得见的闪避窗口：走出火印的人
 *   真的躲开了，走动慢的人只能挨下这一发。它是本组最慢、最重、也是唯一必灼的一招。
 *
 * 自由瞄准（kind: "aim"）：可点任意世界点或实体；主柱固定在准点，只有**明确选中实体**的追身式才继续跟。
 *   每一道火柱都从真实可达的碰撞地面起、上方留出柱身且到落点有 BLOCK-only 通路；追身的后续火柱先记录目标
 *   当时脚下的真实支撑点、提前至少一个间隔显示下一枚火印，锁点后不再随跑者移动——跑出锁点、走出 reach、
 *   目标离场或被墙挡就停，之后不再追加锁点。方向空放（没有选中实体）只有准点这一柱。
 *
 * 三幕：
 *   起（kindle，提交前）：掌心聚火、喉间透热的预告，只播画面。
 *   印（mark，提交后）：落点被一圈焦黑热痕圈住、闷响预热 fuse 刻；这段就是对手的闪避窗口。
 *   涌（bloom → engulf）：火柱从落点涌起包裹，圈内每人各结算一次 pyre 并按 chance=1 必定灼伤；
 *       追身式下每道火柱先给出下一枚火印的预告，再沿锁定点连烧（每道威力 × pinEcho）。
 *
 * 与同族分开：热水是水洼、热风是推人的扇面、热沙大地留沙；只有炼狱必灼、也把一切都交给那段预热。
 * 配置 pin 由 resolve 改时序、由公式改威力与半径，提交后才触碰世界。
 */
namespace PokemonSkills {
    const infernoScene = "world_combat:move_inferno";
    const infernoBurnText = "world_combat.move.inferno.text.burn";
    const infernoHitText = "world_combat.move.inferno.text.hit";
    /** 火柱从落点向上包住多高，与选择高度带一致；顶棚与柱身也用同一数值复核。 */
    const infernoColumnAbove = 3;

    /**
     * 落点向下找真实碰撞支撑顶面：`clipBlocks` 用 COLLIDER，花草、火、液体这类无碰撞面不算。
     * 水面/岩浆/基岩/屏障上不生柱；其它面或不可用返回 null。AI 预测落点同用。
     */
    export function infernoSupport(world: CombatWorld, point: CombatPoint, drop: number): CombatPoint | null {
        const hit = WorldGeometry.blockHit(world, point.plus(WorldCombat.point(0, 0.25, 0)), point.minus(WorldCombat.point(0, drop, 0)));
        if (hit === null || hit.blockFace() !== "up") return null;
        const cell = hit.blockPosition();
        if (cell === null) return null;
        const support = world.block(cell);
        if (support === null) return null;
        const id = String(support.id());
        if (id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
        // 支撑面正上方若仍是水/岩浆，火焰起不来。
        const above = world.block(WorldCombat.point(cell.x(), cell.y() + 1, cell.z()));
        if (above !== null) {
            const aboveId = String(above.id());
            if (aboveId === "minecraft:water" || aboveId === "minecraft:lava") return null;
        }
        return hit.position();
    }

    /** 柱身空间：从落点向上 `height` 格内没有真实碰撞方块。 */
    export function infernoHeadroom(world: CombatWorld, at: CombatPoint, height: number): boolean {
        return WorldGeometry.blockHit(world, at.plus(WorldCombat.point(0, 0.1, 0)), at.plus(WorldCombat.point(0, height, 0))) === null;
    }

    define({
        id: "inferno",
        cooldownParameter: "recharge",
        name: "Inferno",
        description: "在落点的真实碰撞地面埋下一枚火印：先是一圈焦黑的热痕闷响预热，随后烈焰从地里涌起、向上卷成一根把里面整个包住的火柱，被卷到的一刻必定灼伤。预热够长、范围不宽，走出火印的人真的躲开了。追身式只追明确选中的目标：每道后续火柱先记下目标当时脚下的真实支撑点、提前给出下一枚火印，锁点后不再随跑者移动；跑出锁点、走出射程或被墙挡就停。",
        uses: ["用一段长预热换一发必定灼伤的重击", "在预判对手落脚点时点火印", "把走得慢的重目标整个包住烧透", "追身式下跟着明确选中的目标连烧几道"],
        kind: "aim",
        range: 11,
        maxRange: 15,
        prepare: 8,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "inferno",
        defaults: { pin: false, ai: { maxChase: 12, preferSlow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("inferno", "bloomRadius", pokemon), geometry: "area", style: "inferno",
                color: 0xFF6A22, label: config && config.pin === true ? "追身炼狱" : "定点炼狱" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["inferno"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("inferno", "kindle", context)),
                recover: Math.round(p("inferno", "quench", context)),
                cooldown: Math.round(p("inferno", "recharge", context)),
                active: skills["inferno"].active,
                range: p("inferno", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("inferno:kindle", infernoScene, 1, action.origin(),
                JSON.stringify({ moment: "kindle", pin: config && config.pin === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const pin = !!(config && config.pin);
            const target = action.target();
            const aimPoint = action.targetPosition();
            const power = p("inferno", "pyre", action);
            const radius = Math.max(1.2, p("inferno", "bloomRadius", action));
            const fuse = Math.max(6, Math.round(p("inferno", "fuse", action)));
            const interval = Math.max(4, Math.round(p("inferno", "pinInterval", action)));
            const pinTicks = Math.max(10, Math.round(p("inferno", "pinTicks", action)));
            const echo = Math.max(0.2, Math.min(0.8, p("inferno", "pinEcho", action)));
            const embers = Math.max(10, Math.round(p("inferno", "embers", action)));
            // 追身只有在**明确选中实体**时才追加锁点；方向空放只有准点一柱。
            const echoes = pin && target !== null ? Math.max(1, Math.round(pinTicks / interval) - 1) : 0;
            const scale = radius / 2.1;
            const intensity = Math.max(0.7, Math.min(2.6, power / 100));
            // 主柱固定在真实碰撞地面；没有真实支撑、柱身被遮或墙挡时不生柱。
            const planted = infernoSupport(world, aimPoint, 4);
            const base = planted !== null && infernoHeadroom(world, planted, infernoColumnAbove)
                && WorldGeometry.blockHit(world, action.origin(), planted) === null ? planted : null;
            let lastAt = base !== null ? base : aimPoint, struck = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, infernoScene, 1, lastAt,
                    { moment: "ember", radius: radius, scale: scale, embers: embers }, 26);
                WorldFeedback.text(scope, lastAt.plus(WorldCombat.point(0, 1.4, 0)), infernoHitText, [struck], 28);
                sound(current, "minecraft:block.fire.extinguish");
                done(current);
            }

            /** 追身下一道：先记录目标此刻脚下的真实支撑点，显示下一枚火印，间隔后才起柱；锁点不跟随。 */
            function schedule(current: CombatAction, index: number): void {
                const scope = current.world(), chase = current.target();
                // 目标离场/不可见/无合法通路就停，不再追加锁点。
                if (chase === null || !scope.valid(chase)) { finish(current); return; }
                const body = scope.observe(chase);
                const ground = body !== null && body.visible() ? infernoSupport(scope, body.position(), 4) : null;
                if (ground === null || ground.minus(current.origin()).length() > current.range()
                    || !infernoHeadroom(scope, ground, infernoColumnAbove)
                    || !scope.clear(current.origin(), ground)
                    || WorldGeometry.blockHit(scope, current.origin(), ground) !== null) {
                    finish(current);
                    return;
                }
                WorldFeedback.emit(scope, infernoScene, 1, ground,
                    { moment: "mark", radius: radius, fuse: interval, scale: scale, embers: embers }, interval);
                current.after(interval, function (next: CombatAction) { column(next, index, ground); });
            }

            function column(current: CombatAction, index: number, at: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                // 每柱前复核支撑与柱身：预热期间被拆地/建墙就停，不隔空生柱。
                const support = infernoSupport(scope, at, 2);
                if (support === null || !infernoHeadroom(scope, support, infernoColumnAbove)) { finish(current); return; }
                lastAt = support;
                const dealt = index === 0 ? power : power * echo;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(support, 0, radius, { below: 2, above: infernoColumnAbove }), function (enemy, facts) {
                    // 到受害者的真实遮挡：墙后的人不被这一柱包住。
                    if (WorldGeometry.blockHit(scope, support, facts.position()) !== null) return;
                    const already = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "inferno", dealt, { damage: damageSpec("inferno", "pyre"), status: "burn", chance: 1 })) return;
                    struck++;
                    WorldFeedback.emit(scope, infernoScene, 1, facts.position(),
                        { moment: "engulf", target: String(enemy.ref()), count: Math.round(10 + dealt * 0.22), scale: scale,
                            intensity: intensity, burst: index + 1 }, 24);
                    if (!already && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), infernoBurnText, [], 26);
                });
                WorldFeedback.emit(scope, infernoScene, 1, support,
                    { moment: "bloom", radius: radius, height: infernoColumnAbove, core: Math.max(0.6, radius * 0.6),
                        scale: scale, embers: embers, intensity: intensity, burst: index + 1, total: echoes + 1 }, 30);
                sound(current, index === 0 ? "minecraft:entity.blaze.shoot" : "cobblemon:impact.fire");
                if (index < echoes) { schedule(current, index + 1); return; }
                finish(current);
            }

            sound(action, "cobblemon:move.fireblast.actor");
            WorldFeedback.emit(world, infernoScene, 1, lastAt,
                { moment: "mark", radius: radius, fuse: fuse, scale: scale, embers: embers }, fuse);
            action.after(fuse, function (next: CombatAction) {
                if (base === null) {
                    // 没有真实可达地面：火印贴不住，只留一声闷响。
                    WorldFeedback.emit(next.world(), infernoScene, 1, lastAt,
                        { moment: "ember", radius: 0.4, scale: scale, embers: Math.round(embers * 0.4) }, 18);
                    finish(next);
                    return;
                }
                column(next, 0, base);
            });
        }
    });
}
