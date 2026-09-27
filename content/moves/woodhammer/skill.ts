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
        description: "把躯体绷硬成一柄木槌，抬起身体再朝抬身前锁定的落点整副砸下：命中造成重击并把目标砸飞、压下一段速度，砸在真实接触面上时扬起短暂的碎木与裂纹（只做画面，不改动方块），自己承担反震。防御直接参与威力，硬体也减轻反伤。",
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
            const reach = p("woodhammer", "reach", action);
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
            const observedStart = target !== null ? world.observe(target) : null;
            const self0 = world.observe(actor);
            // 抬身前就锁定落锤点：优先目标当刻真实中心，否则用选定点；超出 reach 沿同方向收到 reach 内。
            // 之后整段下砸都朝这个固定点，不再逐刻重瞄移动中的目标中心而拖成长追踪。
            let lockPoint = observedStart !== null ? observedStart.position() : action.targetPosition();
            if (self0 !== null) {
                const heading = lockPoint.minus(self0.position());
                if (heading.length() > reach) lockPoint = self0.position().plus(heading.unit().scale(reach));
            }
            let settled = false, pending: string[] = [], peakY = self0 !== null ? self0.position().y() : 0;

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

            /**
             * 落定：只有伤害回执成立才播砸实，被拒绝/免疫只算落空，不报砸实。
             * 地裂只在一块真实方块接触面（blockPosition 存在）上扬起，用真实接触点与接触面法线；
             * 空中砸中活体没有方块接触面，就不画地裂。
             */
            function crash(current: CombatAction, at: CombatPoint, hit: CombatImpact | null, landed: boolean): void {
                movementScenes.stop(current);
                const scope = current.world();
                const body = scope.observe(actor);
                const face = woodhammerFace(hit !== null ? hit.blockFace() : "");
                const faceVector = [face.x(), face.y(), face.z()];
                const hasSurface = hit !== null && hit.blockPosition() !== null;
                if (body !== null) {
                    WorldFeedback.emit(scope, woodhammerScene, 1, at,
                        { moment: landed ? "impact" : "whiff",
                            target: landed && hit !== null && hit.target() !== null ? String(hit.target()!.ref()) : "",
                            splinters: splinters, cracks: cracks, crackTicks: crackTicks, face: faceVector, direction: faceVector,
                            scale: scale, intensity: intensity }, 30);
                    if (hasSurface) {
                        // 裂纹只做画面：贴在真实接触面上，按 crackTicks 存续，不改动任何方块。
                        WorldFeedback.emit(scope, woodhammerScene, 1, hit!.position(),
                            { moment: "crack", cracks: cracks, crackTicks: crackTicks, scale: scale,
                                face: faceVector, direction: faceVector }, crackTicks);
                    }
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                        landed ? woodhammerHitText : woodhammerWhiffText, [], 26);
                }
                sound(current, "minecraft:block.wood.break");
                sound(current, "minecraft:block.anvil.land");
                finish(current);
            }

            /** 下砸：朝锁定的落点走完有限路程；地面/顶棚/首体由原生扫掠真实截断，不再追人。 */
            function slam(current: CombatAction, guard: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const here = self.position();
                const heading = lockPoint.minus(here);
                if (guard > 24 || heading.length() < 0.05) { crash(current, here, null, false); return; }
                const step = Math.min(pace, heading.length());
                const swept = sweepStep(current, heading.unit().scale(step), radius);
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
                    crash(current, point, impactHit, landed);
                    return;
                }
                if (impactHit.blocked()) { crash(current, impactHit.position(), impactHit, false); return; }
                const moved = swept.moved;
                if (moved < minimumMove) { crash(current, here, null, false); return; }
                movementScenes.show(current, "fall", here, { moment: "fall", splinters: splinters, scale: scale, intensity: intensity,
                    height: Math.max(0, Math.round((peakY - here.y()) * 100) / 100) });
                current.after(1, function (next) { slam(next, guard + 1); });
            }

            function raiseBody(current: CombatAction, climbed: number): void {
                const scope = current.world(), self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                if (climbed >= rise - 0.05) { peakY = self.position().y(); movementScenes.stop(current, "raise"); slam(current, 0); return; }
                const lift = Math.min(pace * 1.2, rise - climbed);
                const moved = scope.displace(actor, WorldCombat.point(0, lift, 0));
                if (moved < lift * 0.5) {
                    const blockedBody = scope.observe(actor);
                    peakY = blockedBody !== null ? blockedBody.position().y() : self.position().y();
                    movementScenes.stop(current, "raise"); slam(current, 0); return;
                }
                const lifted = scope.observe(actor);
                if (lifted !== null) {
                    peakY = lifted.position().y();
                    movementScenes.show(current, "raise", lifted.position(),
                        { moment: "raise", splinters: splinters, scale: scale, intensity: intensity, height: Math.round((climbed + moved) * 100) / 100 });
                }
                current.after(1, function (next) { raiseBody(next, climbed + moved); });
            }

            raiseBody(action, 0);
        }
    });
}
