/**
 * 修长之角 / smartstrike 的出手方式。
 *
 * 核心念头：角尖自己锁定目标，一路修正方向追着刺过去——甲越硬，角咬得越深。转向有上限，所以持续横移
 * 或绕到侧面能把角甩开；正面有墙时角尖停在墙面，不会隔墙刺到。
 *
 * 两幕：
 *   起（lock，提交前）：压低长角，一条锁定的细线连到对手身上（可被打断的预告）。
 *   刺（charge → stab / pierce / wall / miss）：提交后角尖带着施法者逐刻朝目标拐过去；每刻把前进路径扫一遍，
 *       碰到活体就扎下去。贴到跟前也走一次真实短 trace，墙或同伴挡在中间就扎不到。目标离场后沿最后方向
 *       短收一刺，不再延长锁定。命中把目标顶开、在甲缝上迸出钢花。
 *
 * 与同族分开：燕返是掠过的整条直线刀路，修长之角是**锁定后单点追刺**；燕返靠玩家锁定方向，这招靠
 * 有限转向修正与「目标防御越高咬得越深」。
 */
namespace PokemonSkills {
    const smartstrikeScene = "world_combat:move_smartstrike";
    const smartstrikePierceText = "world_combat.move.smartstrike.text.pierce";
    const smartstrikeMissText = "world_combat.move.smartstrike.text.miss";

    /** 把朝向从 heading 朝 desired 修正至多 maxDeg 度。 */
    function smartstrikeSteer(heading: CombatPoint, desired: CombatPoint, maxDeg: number): CombatPoint {
        const a = heading.unit(), b = desired.unit();
        const dot = Math.max(-1, Math.min(1, a.x() * b.x() + a.y() * b.y() + a.z() * b.z()));
        const angle = Math.acos(dot);
        const limit = maxDeg * Math.PI / 180;
        if (angle < 1e-4 || angle <= limit) return b;
        const t = limit / angle;
        const mixed = a.scale(1 - t).plus(b.scale(t));
        return mixed.length() < 1e-6 ? b : mixed.unit();
    }

    define({
        freeMovement: true,
        id: "smartstrike",
        name: "Smart Strike",
        description: "角尖自己锁定对手，一路修正方向追着刺过去；角每刻最多只拐那么多，横移够快就能从侧面甩开。刺的是甲缝，对手防御越高，这一角咬得越深；墙或同伴挡在中间时角尖停在接触面，不隔墙刺到。",
        uses: ["锁定后一记追人的角刺", "专挑高防目标的甲缝", "从较远处拐着角扎上去"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "charge",
        defaults: { focus: false, ai: { maxChase: 14, toughFirst: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("smartstrike", "stabRadius", pokemon) * 1.6, geometry: "line", style: "charge", color: 0xC9D6E0, label: "修长之角" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["smartstrike"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var focus = !!(config && config.focus);
            return {
                prepare: Math.max(3, Math.round(p("smartstrike", "prepare", context))) + (focus ? 4 : 0),
                recover: p("smartstrike", "recover", context),
                cooldown: p("smartstrike", "cooldown", context) + (focus ? 6 : 0),
                range: p("smartstrike", "lockRange", context)
            };
        },
        windup: function (action, config, prepare) {
            var point = action.targetPosition(), origin = action.origin();
            action.present("world_combat:move_smartstrike:lock", smartstrikeScene, 1, origin,
                JSON.stringify({ moment: "lock", windup: prepare, focus: !!(config && config.focus),
                    path: [[origin.x(), origin.y(), origin.z()], [point.x(), point.y(), point.z()]],
                    direction: [action.direction().x(), action.direction().y(), action.direction().z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(smartstrikeScene);
            const world = action.world();
            const actor = action.actor();
            const focus = !!(config && config.focus);
            const lockRange = p("smartstrike", "lockRange", action);
            const speed = p("smartstrike", "chargeSpeed", action);
            const steering = p("smartstrike", "steering", action);
            const radius = p("smartstrike", "stabRadius", action);
            const push = p("smartstrike", "push", action);
            const selected = action.target();
            const scale = radius / 0.5;
            let heading = aim(action);
            let travelled = 0;
            let settled = false;

            sound(action, "minecraft:entity.wind_charge.throw");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                movementScenes.finish(current, done);
            }

            function miss(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body === null ? current.origin() : body.position();
                WorldFeedback.emit(scope, smartstrikeScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), smartstrikeMissText, [], 20);
                movementScenes.finish(current, done);
            }

            /** 角尖撞上真实方块面：在接触格迸出钢花，而不是隔墙播刺。 */
            function wall(current: CombatAction, contact: CombatImpact): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const cell = contact.blockPosition();
                const at = cell === null ? contact.position() : cell;
                WorldFeedback.emit(scope, smartstrikeScene, 1, at,
                    { moment: "wall", face: contact.blockFace(), scale: scale, intensity: Math.max(0.6, Math.min(2.0, scale)) }, 20);
                scope.sound("cobblemon:impact.steel", at, 12, "{}");
                movementScenes.finish(current, done);
            }

            /** 角刺结算；目标防御越高，公式里的加成越大。 */
            function stab(current: CombatAction, victim: CombatActor, point: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                const context: NumberContext = { pokemon: CobblemonCombat.pokemon(actor), skill: skills["smartstrike"],
                    detail: { values: config }, world: scope, actor: actor, target: { world: scope, actor: victim } };
                const power = p("smartstrike", "thrust", context);
                const intensity = Math.max(0.6, Math.min(2.4, power / 70));
                const landed = hurt(current, victim, "smartstrike", power,
                    { damage: damageSpec("smartstrike", "thrust"), contact: true });
                if (landed) {
                    const self = scope.observe(actor), body = scope.observe(victim);
                    if (self !== null && body !== null) {
                        const away = body.position().minus(self.position());
                        if (away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(push));
                    }
                    const where = scope.observe(victim);
                    const at = where === null ? point : where.position();
                    WorldFeedback.emit(scope, smartstrikeScene, 1, at,
                        { moment: "stab", target: String(victim.ref()), intensity: intensity,
                          notes: Math.max(12, Math.round(power * 1.1)), scale: scale }, 24);
                    WorldFeedback.emit(scope, smartstrikeScene, 1, at,
                        { moment: "pierce", target: String(victim.ref()), intensity: intensity, scale: scale }, 24);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), smartstrikePierceText, [Math.round(power)], 26);
                    scope.sound("cobblemon:impact.steel", at, 14, "{}");
                    scope.sound("minecraft:item.trident.hit", at, 12, "{}");
                }
                settled = true;
                movementScenes.finish(current, done);
            }

            /** 贴身到位：也走一次真实短 trace，只有角尖真的碰到身体才扎。 */
            function closeStab(current: CombatAction, here: CombatPoint, point: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                const contact = current.trace(here, point, radius, true);
                const other = contact.hitEntity() ? contact.target() : null;
                if (other !== null && !scope.friendly(other) && scope.valid(other)) { stab(current, other, contact.position()); return; }
                if (contact.blocked()) { wall(current, contact); return; }
                miss(current);
            }

            /** 目标离场：沿最后方向短收一刺，不再延长锁定。 */
            function recover(current: CombatAction, here: CombatPoint): void {
                if (settled) return;
                const scope = current.world();
                const contact = current.trace(here, here.plus(heading.scale(Math.max(0.7, radius + 0.6))), radius, true);
                const other = contact.hitEntity() ? contact.target() : null;
                if (other !== null && !scope.friendly(other) && scope.valid(other)) { stab(current, other, contact.position()); return; }
                if (contact.blocked()) { wall(current, contact); return; }
                miss(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const here = self.position();
                const victim = selected !== null && scope.valid(selected) ? selected : null;
                if (victim === null) { recover(current, here); return; }
                const body = scope.observe(victim);
                if (body === null) { recover(current, here); return; }
                const desired = body.position().minus(here);
                const distance = desired.length();
                if (distance <= radius + 0.9) { closeStab(current, here, body.position()); return; }
                heading = smartstrikeSteer(heading, desired, steering);
                // 冲锋贴着地面走：横向转向仍按转向修正，垂直分量不驱动身体，避免角尖在坡地上被地形挡住。
                const horizontal = WorldCombat.point(heading.x(), 0, heading.z());
                const sweepDir = horizontal.length() < 0.05 ? heading : horizontal.unit();
                const step = Math.min(speed, Math.max(0.05, distance - radius));
                const delta = sweepDir.scale(step);
                // 冲锋朝向用当前真实转向，画面里的角尖轴与判定一致。
                movementScenes.show(current, "charge", here,
                    { moment: "charge", scale: scale, focus: focus, direction: [sweepDir.x(), sweepDir.y(), sweepDir.z()] });
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const other = hit.target();
                    if (other !== null && !scope.friendly(other) && scope.valid(other)) { stab(current, other, hit.position()); return; }
                }
                if (hit.blocked()) { wall(current, hit); return; }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                if (moved < 0.05 || travelled >= lockRange + 3) { miss(current); return; }
                current.after(1, advance);
            }

            movementScenes.show(action, "charge", action.origin(),
                { moment: "charge", scale: scale, focus: focus, direction: [heading.x(), heading.y(), heading.z()] });
            if (selected === null || !world.valid(selected)) { miss(action); return; }
            advance(action);
        }
    });
}
