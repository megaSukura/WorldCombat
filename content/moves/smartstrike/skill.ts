/**
 * 修长之角 / smartstrike 的出手方式。
 *
 * 核心念头：角尖自己锁定目标，一路修正方向追着刺过去——甲越硬，角咬得越深，所以这一刺躲不掉。
 *
 * 两幕：
 *   起（lock，提交前）：压低长角，一条锁定的细线连到对手身上（可被打断的预告）。
 *   刺（charge → stab → pierce）：提交后角尖带着施法者逐刻朝目标拐过去；每刻把前进路径扫一遍，
 *       碰到活体或追到角尖够得着时扎下去，命中把目标顶开、在甲缝上迸出钢花。
 *   目标若在起手时已离场，收角空刺。
 *
 * 与同族分开：燕返是掠过的整条刀路，修长之角是**锁定后单点追刺**；燕返靠速度覆盖，这招靠转向修正与
 * 「目标防御越高咬得越深」。
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
        description: "角尖自己锁定对手，一路修正方向追着刺过去；因为角追着人拐，所以躲不掉。刺的是甲缝，对手防御越高，这一角咬得越深。",
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
            WorldFeedback.emit(world, smartstrikeScene, 1, action.origin(),
                { moment: "charge", scale: scale, focus: focus }, 20);

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            function miss(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, smartstrikeScene, 1, current.origin(), { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.2, 0)), smartstrikeMissText, [], 20);
                done(current);
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
                        if (away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
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
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const victim = selected !== null && scope.valid(selected) ? selected : null;
                if (victim === null) { miss(current); return; }
                const body = scope.observe(victim);
                if (body === null) { miss(current); return; }
                const here = self.position(), desired = body.position().minus(here);
                const distance = desired.length();
                if (distance <= radius + 0.9) { stab(current, victim, body.position()); return; }
                heading = smartstrikeSteer(heading, desired, steering);
                const step = Math.min(speed, Math.max(0.05, distance - radius));
                const delta = heading.scale(step);
                const hit = current.trace(here, here.plus(delta.scale(1.4)), radius);
                if (hit.hitEntity()) {
                    const other = hit.target();
                    if (other !== null && !scope.friendly(other)) { stab(current, other, hit.position()); return; }
                }
                const moved = scope.displace(actor, delta);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= lockRange + 3) { miss(current); return; }
                current.after(1, advance);
            }

            if (selected === null || !world.valid(selected)) { miss(action); return; }
            advance(action);
        }
    });
}
