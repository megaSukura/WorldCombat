/**
 * 炼狱 / inferno 的出手方式。
 *
 * 核心念头：在落点的地面埋下一枚火印——先是一圈焦黑的热痕闷响预热，随后烈焰从地里涌起、向上卷成一根
 *   把里面整个包住的火柱；被卷到的一刻必定灼伤。原生 50% 的命中就是这段看得见的闪避窗口：走出火印的人
 *   真的躲开了，走动慢的人只能挨下这一发。它是本组最慢、最重、也是唯一必灼的一招。
 *
 * 自由瞄准（kind: "aim"）：可点任意世界点或实体；主柱固定在准点，只有**明确选中实体**的追身式才继续跟。
 *   每一道火柱都从真实可达的地面起、上方留出高度且不被墙挡；追身的后续火柱先记录目标当时脚下的支撑点、
 *   提前至少一个间隔显示下一枚火印，锁点后不再随跑者移动——跑出锁点或走出 reach／被墙挡就停。
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

    /** 从上往下找第一块真正撑得住火柱的地面；水面、岩浆、基岩上不生柱，找不到返回 null。 */
    function infernoGround(world: CombatWorld, point: CombatPoint, drop: number): CombatPoint | null {
        const x = Math.floor(point.x()), z = Math.floor(point.z()), top = Math.floor(point.y());
        for (let dy = 1; dy >= -Math.max(0, Math.floor(drop)); dy--) {
            const block = world.block(WorldCombat.point(x, top + dy, z));
            if (block === null) return null;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
            return WorldCombat.point(x + 0.5, top + dy + 1, z + 0.5);
        }
        return null;
    }

    /** 柱脚下留出有限高度的空位：头顶被遮住的地方柱立不起来。 */
    function infernoHeadroom(world: CombatWorld, at: CombatPoint, height: number): boolean {
        const x = Math.floor(at.x()), z = Math.floor(at.z()), base = Math.floor(at.y());
        for (let i = 0; i < height; i++) {
            const block = world.block(WorldCombat.point(x, base + i, z));
            if (block === null) return false;
            const id = String(block.id());
            if (id !== "minecraft:air" && id !== "minecraft:cave_air" && id !== "minecraft:void_air") return false;
        }
        return true;
    }

    define({
        id: "inferno",
        cooldownParameter: "recharge",
        name: "Inferno",
        description: "在落点的真实地面埋下一枚火印：先是一圈焦黑的热痕闷响预热，随后烈焰从地里涌起、向上卷成一根把里面整个包住的火柱，被卷到的一刻必定灼伤。预热够长、范围不宽，走出火印的人真的躲开了。追身式只追明确选中的目标：每道后续火柱先记下目标当时脚下的真实支撑点、提前给出下一枚火印，锁点后不再随跑者移动；跑出锁点或被墙挡就停。",
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
            const aimPoint = action.targetPosition();
            const power = p("inferno", "pyre", action);
            const radius = Math.max(1.2, p("inferno", "bloomRadius", action));
            const fuse = Math.max(6, Math.round(p("inferno", "fuse", action)));
            const interval = Math.max(4, Math.round(p("inferno", "pinInterval", action)));
            const pinTicks = Math.max(10, Math.round(p("inferno", "pinTicks", action)));
            const echo = Math.max(0.2, Math.min(0.8, p("inferno", "pinEcho", action)));
            const embers = Math.max(10, Math.round(p("inferno", "embers", action)));
            const echoes = pin ? Math.max(1, Math.round(pinTicks / interval) - 1) : 0;
            const scale = radius / 2.1;
            const intensity = Math.max(0.7, Math.min(2.6, power / 100));
            // 主柱固定在真实可达的地面；没有真实地面、头顶被遮或墙挡时不生柱。
            const planted = infernoGround(world, aimPoint, 4);
            const base = planted !== null && infernoHeadroom(world, planted, 2)
                && !action.trace(action.origin(), planted, 0.25, true).blocked() ? planted : null;
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
                const scope = current.world(), target = current.target();
                if (target === null) {
                    // 未选中实体：按固定落点继续，不自动搜附近旁人。
                    WorldFeedback.emit(scope, infernoScene, 1, lastAt,
                        { moment: "mark", radius: radius, fuse: interval, scale: scale, embers: embers }, interval + 8);
                    current.after(interval, function (next: CombatAction) { column(next, index, lastAt); });
                    return;
                }
                const body = scope.observe(target);
                const ground = body !== null && scope.valid(target) ? infernoGround(scope, body.position(), 4) : null;
                if (ground === null || ground.minus(current.origin()).length() > current.range()
                    || !infernoHeadroom(scope, ground, 2) || current.trace(current.origin(), ground, 0.25, true).blocked()) {
                    finish(current);
                    return;
                }
                WorldFeedback.emit(scope, infernoScene, 1, ground,
                    { moment: "mark", radius: radius, fuse: interval, scale: scale, embers: embers }, interval + 8);
                current.after(interval, function (next: CombatAction) { column(next, index, ground); });
            }

            function column(current: CombatAction, index: number, at: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                lastAt = at;
                const dealt = index === 0 ? power : power * echo;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(at, 0, radius, { below: 2, above: 3 }), function (enemy, facts) {
                    const already = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "inferno", dealt, { damage: damageSpec("inferno", "pyre"), status: "burn", chance: 1 })) return;
                    struck++;
                    WorldFeedback.emit(scope, infernoScene, 1, facts.position(),
                        { moment: "engulf", target: String(enemy.ref()), count: Math.round(10 + dealt * 0.22), scale: scale,
                            intensity: intensity, burst: index + 1 }, 24);
                    if (!already && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), infernoBurnText, [], 26);
                });
                WorldFeedback.emit(scope, infernoScene, 1, at,
                    { moment: "bloom", radius: radius, scale: scale, embers: embers, intensity: intensity,
                        burst: index + 1, total: echoes + 1 }, 30);
                sound(current, index === 0 ? "minecraft:entity.blaze.shoot" : "cobblemon:impact.fire");
                if (index < echoes) { schedule(current, index + 1); return; }
                finish(current);
            }

            sound(action, "cobblemon:move.fireblast.actor");
            WorldFeedback.emit(world, infernoScene, 1, lastAt,
                { moment: "mark", radius: radius, fuse: fuse, scale: scale, embers: embers }, fuse + 12);
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
