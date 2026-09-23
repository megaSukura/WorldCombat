/**
 * 炼狱 / inferno 的出手方式。
 *
 * 核心念头：在落点的地面埋下一枚火印——先是一圈焦黑的热痕闷响预热，随后烈焰从地里涌起、向上卷成一根
 *   把里面整个包住的火柱；被卷到的一刻必定灼伤。原生 50% 的命中就是这段看得见的闪避窗口：走出火印的人
 *   真的躲开了，走动慢的人只能挨下这一发。它是本组最慢、最重、也是唯一必灼的一招。
 *
 * 三幕：
 *   起（kindle，提交前）：掌心聚火、喉间透热的预告，只播画面。
 *   印（mark，提交后）：落点被一圈焦黑热痕圈住、闷响预热 fuse 刻；这段就是对手的闪避窗口。
 *   涌（bloom → engulf）：火柱从落点涌起包裹，圈内每人各结算一次 pyre 并按 chance=1 必定灼伤；
 *       追身式下火柱随后沿目标位置连烧几道（每道威力 × pinEcho），定点式只有这一发。
 *
 * 与同族分开：热水是水洼、热风是推人的扇面、热沙大地留沙；只有炼狱必灼、也把一切都交给那段预热。
 * 配置 pin 由 resolve 改时序、由公式改威力与半径，提交后才触碰世界。
 */
namespace PokemonSkills {
    const infernoScene = "world_combat:move_inferno";
    const infernoBurnText = "world_combat.move.inferno.text.burn";
    const infernoHitText = "world_combat.move.inferno.text.hit";

    define({
        id: "inferno",
        cooldownParameter: "recharge",
        name: "Inferno",
        description: "在落点的地面埋下一枚火印：先是一圈焦黑的热痕闷响预热，随后烈焰从地里涌起、向上卷成一根把里面整个包住的火柱，被卷到的一刻必定灼伤。预热够长、范围不宽，走出火印的人真的躲开了——它是本组最慢、最重、也最稳必灼的一招。",
        uses: ["用一段长预热换一发必定灼伤的重击", "在预判对手落脚点时点火印", "把走得慢的重目标整个包住烧透", "追身式下跟着目标连烧几道"],
        kind: "point",
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
            const actor = action.actor();
            const pin = !!(config && config.pin);
            const point = action.targetPosition();
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
            let pinRef = "", lastAt = point, struck = 0, settled = false;

            // 追身式：记下落点附近最近的一个敌人，后续火柱沿它当前位置压过去。
            if (pin) {
                let best: CombatActor | null = null, bestDistance = 7;
                const nearby = world.query(point, 6.5, false);
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (!world.valid(other) || world.friendly(other) || String(other.ref()) === String(actor.ref())) continue;
                    const body = world.observe(other);
                    if (body === null) continue;
                    const distance = body.position().minus(point).length();
                    if (distance < bestDistance) { bestDistance = distance; best = other; }
                }
                if (best !== null) pinRef = String(best.ref());
            }

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

            function bloom(current: CombatAction, index: number): void {
                const scope = current.world();
                let at = point;
                if (pin && index > 0 && pinRef !== "") {
                    const tracked = scope.actor(pinRef);
                    if (tracked !== null && scope.valid(tracked)) {
                        const body = scope.observe(tracked);
                        if (body !== null) at = body.position();
                    }
                }
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
                if (index < echoes) { current.after(interval, function (next: CombatAction) { bloom(next, index + 1); }); return; }
                finish(current);
            }

            sound(action, "cobblemon:move.fireblast.actor");
            WorldFeedback.emit(world, infernoScene, 1, point,
                { moment: "mark", radius: radius, fuse: fuse, scale: scale, embers: embers }, fuse + 12);
            action.after(fuse, function (next: CombatAction) { bloom(next, 0); });
        }
    });
}
