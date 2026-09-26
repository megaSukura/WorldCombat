/**
 * 木槌 / woodhammer 的出手方式。
 *
 * 核心念头：把躯体绷硬成一柄木槌，抬起身体再整副砸下去——落地的一刻沿接触面扬起碎木，被砸实的人被压得踉跄。
 * 它是这一族里最慢、最重、唯一垂直砸下的一招；体重与防御既进威力、也进反震与落点的碎屑。
 *
 * 两幕（砸空多一幕）：
 *   起（windup，提交前）：躯体绷硬、抬起，只播预告。
 *   砸（rise → slam → impact / whiff）：提交后先把身体抬起 rise 高度，再朝所选落点砸下去；
 *       砸到活体即结算 timber 接触伤害（共享反震）、把人沿砸击方向撞飞 shove 格，并在下一刻把速度压下
 *       stagger 级；无论砸中还是砸空，落点都沿接触面扬起 cracks 片短暂的地裂碎屑（只做画面，不改动方块）。
 *
 * 选取为 aim：可点选可达落点，墙/顶阻挡时按实际落点砸；重体 Boss 免推时仍吃这一记槌击。
 *
 * 与同族分开：舍身冲撞是横向猛撞、撞完贴住压身；勇鸟猛攻是一条长俯冲线穿过目标；波动冲裹水撞人。
 * 木槌的辨识点是垂直落下的碎木与短暂裂纹。配置 root（扎根式）由 resolve 改时序、由公式改数值。
 */
namespace PokemonSkills {
    const woodhammerScene = "world_combat:move_woodhammer";
    const woodhammerHitText = "world_combat.move.woodhammer.text.hit";
    const woodhammerWhiffText = "world_combat.move.woodhammer.text.whiff";

    /** 原生方块接触面的外法线；未知接触回落到向上。 */
    function woodhammerFace(face: string): CombatPoint {
        if (face === "down") return WorldCombat.point(0, -1, 0);
        if (face === "north") return WorldCombat.point(0, 0, -1);
        if (face === "south") return WorldCombat.point(0, 0, 1);
        if (face === "west") return WorldCombat.point(-1, 0, 0);
        if (face === "east") return WorldCombat.point(1, 0, 0);
        return WorldCombat.point(0, 1, 0);
    }

    define({
        freeMovement: true,
        id: "woodhammer",
        cooldownParameter: "recharge",
        name: "Wood Hammer",
        description: "把躯体绷硬成一柄木槌，抬起身体再整副砸下：命中造成重击并把目标砸飞、压下一段速度，落点沿接触面扬起短暂的碎木与裂纹（只做画面，不改动方块），自己承担反震。防御直接参与威力，硬体也减轻反伤。",
        uses: ["砸实一个贴身的厚目标", "把目标砸得踉跄、削掉速度", "在落点扬起地裂碎屑，标记这一击的位置"],
        kind: "aim",
        range: 2.6,
        maxRange: 4.6,
        prepare: 12,
        active: 28,
        recover: 12,
        cooldown: 50,
        style: "slam",
        maximumTicks: 160,
        defaults: { root: false, ai: { maxChase: 7, minHealth: 0.35, preferHeld: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("woodhammer", "collisionRadius", pokemon) * 1.6, geometry: "area", style: "slam",
                color: 0x7A8B4A, label: config && config.root === true ? "扎根式木槌" : "木槌" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["woodhammer"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("woodhammer", "tempo", context)),
                recover: Math.round(p("woodhammer", "aftercast", context)),
                cooldown: Math.round(p("woodhammer", "recharge", context)),
                active: skills["woodhammer"].active,
                range: p("woodhammer", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_woodhammer:harden", woodhammerScene, 1, action.origin(),
                JSON.stringify({ moment: "harden", root: !!(config && config.root) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(woodhammerScene);
            const world = action.world();
            const actor = action.actor();
            const rise = p("woodhammer", "rise", action);
            const pace = p("woodhammer", "pace", action);
            const radius = p("woodhammer", "collisionRadius", action);
            const minimumMove = p("woodhammer", "minimumMove", action);
            const power = p("woodhammer", "timber", action);
            const recoil = p("woodhammer", "recoil", action);
            const shove = p("woodhammer", "shove", action);
            const stagger = Math.max(1, Math.round(p("woodhammer", "stagger", action)));
            const splinters = Math.round(p("woodhammer", "splinters", action));
            const cracks = Math.max(4, Math.round(p("woodhammer", "cracks", action)));
            const crackTicks = Math.max(40, Math.round(p("woodhammer", "crackTicks", action)));
            const root = !!(config && config.root);
            const scale = radius / 0.62;
            const intensity = Math.max(0.6, Math.min(2.6, power / 115));
            const target = action.target();
            const direction = aim(action);
            let settled = false, pending: string[] = [];

            WorldFeedback.emit(world, woodhammerScene, 1, action.origin(),
                { moment: "harden", splinters: splinters, scale: scale, intensity: intensity, root: root ? 1 : 0 }, 40);
            movementScenes.show(action, "raise", action.origin(), { moment: "raise", splinters: splinters, scale: scale, intensity: intensity, height: 0 });
            sound(action, "minecraft:block.wood.hit");
            sound(action, "minecraft:entity.iron_golem.attack");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                if (!pending.length) { movementScenes.finish(current, done); return; }
                const refs = pending.slice();
                // 等这一发的伤害结算完的下一刻再压速度（与伤害同一刻会互相顶掉）。
                current.after(1, function (next: CombatAction) {
                    const scope = next.world();
                    for (let i = 0; i < refs.length; i++) {
                        const victim = scope.actor(refs[i]);
                        if (victim !== null && scope.valid(victim)) NativeEffects.boost(scope, victim, "spe", -stagger);
                    }
                    movementScenes.finish(next, done);
                });
            }

            /** 落地：无论砸中人还是砸空，落点都沿接触面扬起短暂的裂纹碎屑，不改动方块。 */
            function crash(current: CombatAction, at: CombatPoint, hit: CombatImpact | null): void {
                movementScenes.stop(current);
                const scope = current.world();
                const body = scope.observe(actor);
                const contact = hit !== null && hit.blockPosition() !== null ? hit.blockPosition()! : at;
                const face = woodhammerFace(hit !== null ? hit.blockFace() : "");
                if (body !== null) {
                    WorldFeedback.emit(scope, woodhammerScene, 1, at,
                        { moment: hit !== null ? "impact" : "whiff",
                            target: hit !== null && hit.target() !== null ? String(hit.target()!.ref()) : "",
                            splinters: splinters, cracks: cracks, crackTicks: crackTicks, face: [face.x(), face.y(), face.z()],
                            scale: scale, intensity: intensity }, 30);
                    // 裂纹只做画面：独立余波按 crackTicks 存续，不改动任何方块。
                    WorldFeedback.emit(scope, woodhammerScene, 1, contact,
                        { moment: "crack", cracks: cracks, crackTicks: crackTicks, scale: scale, face: [face.x(), face.y(), face.z()] }, crackTicks);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                        hit !== null ? woodhammerHitText : woodhammerWhiffText, [], 26);
                }
                sound(current, "minecraft:block.wood.break");
                sound(current, "minecraft:block.anvil.land");
                finish(current);
            }

            function slam(current: CombatAction, guard: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const here = self.position();
                const observed = target !== null ? scope.observe(target) : null;
                const goal = observed !== null ? observed.position() : action.targetPosition();
                const heading = goal.minus(here);
                if (guard > 50 || heading.length() < 0.05) { crash(current, here, null); return; }
                const step = Math.min(pace, heading.length());
                const delta = heading.unit().scale(step);
                const swept = sweepStep(current, delta, radius);
                const impactHit = swept.hit;
                if (impactHit.hitEntity() && impactHit.target() !== null && !scope.friendly(impactHit.target()!)) {
                    const victim = impactHit.target()!, point = impactHit.position();
                    const landed = impact(current, impactHit, "woodhammer", power,
                        { damage: damageSpec("woodhammer", "timber"), contact: true, recoil: recoil });
                    if (landed && scope.valid(victim)) {
                        const away = WorldCombat.point(direction.x(), 0, direction.z());
                        scope.hitDisplace(victim, (away.length() < 0.05 ? direction : away).unit().scale(shove));
                        pending.push(String(victim.ref()));
                    }
                    crash(current, point, impactHit);
                    return;
                }
                const moved = swept.moved + (impactHit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                if (moved < minimumMove) { crash(current, here, null); return; }
                movementScenes.show(current, "fall", here, { moment: "fall", splinters: splinters, scale: scale, intensity: intensity, height: Math.max(0, here.y() - action.origin().y()) });
                current.after(1, function (next) { slam(next, guard + 1); });
            }

            function raiseBody(current: CombatAction, climbed: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                if (climbed >= rise - 0.05) { movementScenes.stop(current, "raise"); slam(current, 0); return; }
                const lift = Math.min(pace * 1.2, rise - climbed);
                const moved = scope.displace(actor, WorldCombat.point(0, lift, 0));
                if (moved < lift * 0.5) { movementScenes.stop(current, "raise"); slam(current, 0); return; }
                const lifted = scope.observe(actor);
                if (lifted !== null) movementScenes.show(current, "raise", lifted.position(),
                    { moment: "raise", splinters: splinters, scale: scale, intensity: intensity, height: Math.round((climbed + moved) * 100) / 100 });
                current.after(1, function (next) { raiseBody(next, climbed + moved); });
            }

            raiseBody(action, 0);
        }
    });
}
