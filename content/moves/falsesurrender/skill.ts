/**
 * 假跪真撞 / falsesurrender 的出手方式。
 *
 * 核心念头：先伏低装作认错，把自己暴露出去骗过对手的注意；就在这一低头之间，凌乱的黑发从最低处逐刻伸刺出去——
 * 发梢先真正触到身体才结算，中途撞墙就停在墙面、原路缩回；对手的注意越不在施法者身上，这一刺越狠。
 *
 * 两幕：
 *   起（feign，提交前）：伏地低头、乱发竖起，明摆着暴露自己（起手不能动，可被打断）。
 *   刺（lash → hit / wall / miss）：提交后把方向锁死，发梢逐刻向外推进，每刻只 trace 这一小段；第一个碰到的身体
 *       （除自己外）才结算，注意不在施法者身上的目标吃更重的一刺并被顶开。撞墙则尖端停在墙面，同伴挡在前面也停。
 *       到射程尽头或停下后，尖端按原路缩回——收回只是表现，不再追加伤害。
 *   空（无实体）：朝瞄点低方向伸刺到发梢尽头，缩回。
 *
 * 与同族分开：借力摔是等人扑进来的反手摔、修长之角是锁定追刺；假跪真撞是**以认输为饵的伏低发刺**——
 * 代价是施法者自己暴露，收益是对「没在盯自己」的目标打出更重的一击。方向靠玩家锁定，锁歪了就挥空。
 */
namespace PokemonSkills {
    const falsesurrenderScene = "world_combat:move_falsesurrender";
    const falsesurrenderAmbushText = "world_combat.move.falsesurrender.text.ambush";
    const falsesurrenderHitText = "world_combat.move.falsesurrender.text.hit";
    const falsesurrenderMissText = "world_combat.move.falsesurrender.text.miss";

    define({
        id: "falsesurrender",
        name: "False Surrender",
        description: "先伏低装作认输，把对手的注意骗走，再让凌乱的黑发从最低处逐刻伸刺出去：发梢先触到身体才结算，中途撞墙就停在墙面、再原路缩回。对手的注意越不在你身上，这一刺越狠；代价是伏低时你自己不能动。",
        uses: ["伏低装认输，再贴地一记发刺", "对没在盯着自己的目标打出更重的一击", "用较低的出手角度绕开正面护架"],
        kind: "aim",
        range: 4.5,
        maxRange: 6.5,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 34,
        stationary: true,
        style: "thrust",
        defaults: { grovel: false, ai: { maxChase: 8, punish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("falsesurrender", "whipRadius", pokemon) * 1.6, geometry: "line", style: "thrust", color: 0x6A5A8A, label: "假跪真撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["falsesurrender"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(4, Math.round(p("falsesurrender", "bowTicks", context))),
                recover: p("falsesurrender", "recover", context),
                cooldown: p("falsesurrender", "cooldown", context),
                range: p("falsesurrender", "hairReach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_falsesurrender:feign", falsesurrenderScene, 1, action.origin(),
                JSON.stringify({ moment: "feign", windup: prepare, grovel: !!(config && config.grovel) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const lash = WorldFeedback.actionScenes(falsesurrenderScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { lash.finish(action, done); return; }
            // 黑发从身体的低处探出；基端每刻都按当前身体位置重算，画面与判定用同一条线段。
            const base = self.position().plus(WorldCombat.point(0, -Math.max(0.15, self.height() * 0.22), 0));
            const reach = p("falsesurrender", "hairReach", action);
            const lashSpeed = p("falsesurrender", "lashSpeed", action);
            const basePower = p("falsesurrender", "lash", action);
            const ambushBonus = p("falsesurrender", "ambush", action);
            const radius = p("falsesurrender", "whipRadius", action);
            const push = p("falsesurrender", "push", action);
            const scale = radius / 0.5;
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() < 0.05 ? aimed : flat.unit();
            const selfRef = String(actor.ref());
            const intensity = Math.max(0.6, Math.min(2.4, basePower / 80));
            let tip = 0;
            let settled = false;

            sound(action, "minecraft:entity.evoker.cast_spell");

            function show(current: CombatAction, length: number): void {
                const at = base.plus(direction.scale(Math.max(0, length)));
                lash.show(current, "lash", base, { moment: "lash",
                    path: [[base.x(), base.y(), base.z()], [at.x(), at.y(), at.z()]],
                    direction: [direction.x(), direction.y(), direction.z()],
                    intensity: intensity, scale: scale });
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                lash.finish(current, done);
            }

            /** 收回只表现：尖端按原路缩回，不再追加伤害。 */
            function retract(current: CombatAction, from: number, step: number): void {
                if (settled) return;
                show(current, from * (1 - Math.min(1, step / 4)));
                if (step >= 4) { finish(current); return; }
                current.after(1, function (next: CombatAction) { retract(next, from, step + 1); });
            }

            /** 接触点投影到发刺方向上的长度；用于让尖端真的停在墙面或同伴身上。 */
            function projected(contact: CombatImpact): number {
                const offset = contact.position().minus(base);
                return offset.x() * direction.x() + offset.y() * direction.y() + offset.z() * direction.z();
            }

            function whiff(current: CombatAction, wall: CombatImpact | null, length: number): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body === null ? base : body.position();
                if (wall !== null && wall.blocked()) {
                    const cell = wall.blockPosition();
                    const wallAt = cell === null ? wall.position() : cell;
                    WorldFeedback.emit(scope, falsesurrenderScene, 1, wallAt, { moment: "wall", face: wall.blockFace(), scale: scale }, 20);
                } else {
                    WorldFeedback.emit(scope, falsesurrenderScene, 1, at, { moment: "miss", scale: scale }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), falsesurrenderMissText, [], 22);
                }
                retract(current, Math.max(length, tip), 0);
            }

            function resolveHit(current: CombatAction, victim: CombatActor, point: CombatPoint, length: number): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(victim);
                const watching = body === null ? null : body.attacking();
                // 对手的注意不在施法者身上 → 伏低骗到了它，这一刺更重。
                const ambush = watching === null || String(watching.ref()) !== selfRef;
                const power = basePower * (1 + (ambush ? ambushBonus : 0));
                const landed = hurt(current, victim, "falsesurrender", power,
                    { damage: damageSpec("falsesurrender", "lash"), contact: true });
                if (!landed) { retract(current, length, 0); return; }
                const at = body === null ? point : body.position();
                WorldFeedback.emit(scope, falsesurrenderScene, 1, at,
                    { moment: "hit", target: String(victim.ref()), ambush: ambush ? 1 : 0,
                      intensity: intensity, notes: Math.max(14, Math.round(power * 1.1)), scale: scale }, 24);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)),
                    ambush ? falsesurrenderAmbushText : falsesurrenderHitText, [Math.round(power)], 26);
                scope.sound("cobblemon:impact.dark", at, 14, "{}");
                // 只有真实推动了才播撞顿；免位移目标照常吃伤，不被画面搬动。
                if (scope.valid(victim)) {
                    const before = scope.observe(victim);
                    const moved = before === null ? 0 : scope.displace(victim, direction.scale(push));
                    if (moved > 0.01) {
                        const after = scope.observe(victim);
                        if (after !== null) WorldFeedback.emit(scope, falsesurrenderScene, 1, after.position(),
                            { moment: "stagger", target: String(victim.ref()), ambush: ambush ? 1 : 0, intensity: intensity, scale: scale }, 26);
                    }
                }
                retract(current, length, 0);
            }

            function extend(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const next = Math.min(reach, tip + lashSpeed);
                const through = current.trace(base.plus(direction.scale(tip)), base.plus(direction.scale(next)), radius, true);
                const other = through.hitEntity() ? through.target() : null;
                if (other !== null && !scope.friendly(other) && scope.valid(other)) {
                    // 尖端停在真实接触点，再缩回。
                    const stopAt = Math.max(tip, Math.min(next, projected(through)));
                    show(current, stopAt);
                    tip = stopAt;
                    resolveHit(current, other, through.position(), stopAt);
                    return;
                }
                if (through.hitEntity() || through.blocked()) {
                    // 同伴或方块挡在发梢前：尖端停在真实接触点，不隔人/隔墙结算。
                    const stopAt = Math.max(tip, Math.min(next, projected(through)));
                    show(current, stopAt);
                    tip = stopAt;
                    whiff(current, through.hitEntity() ? null : through, stopAt);
                    return;
                }
                tip = next;
                show(current, tip);
                if (next >= reach - 0.001) { whiff(current, null, tip); return; }
                current.after(1, function (nextAction: CombatAction) { extend(nextAction); });
            }

            show(action, 0);
            extend(action);
        }
    });
}
