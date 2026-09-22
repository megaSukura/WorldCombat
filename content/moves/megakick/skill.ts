/**
 * 百万吨重踢 / megakick 的出手方式。
 *
 * 核心念头：把一条腿整条拉满、身体后仰蓄势，再连人带腿撞穿对手——力量大到把对手直接踢飞出去。
 * 这是本族最重、最慢、也最需要「整副身体押上去」的一记：一旦踢空，冲势收不住，要多吃一段踉跄。
 *
 * 两幕（提交前只播预告）：
 *   起（haul）：一条腿高抬后撤、身体后仰，尘点向脚下收拢，只播预告。
 *   踢（drive → impact / launch / whiff）：提交后沿瞄准方向整身突进；trace 碰到活体的一刻结算 `kick` 接触伤害，
 *       并把目标沿踢击方向抛飞（水平 launchBack 格、向上 launchUp 格）。踢飞式抬得远、砸穿式压得更重。
 *       冲到底或撞墙算落空，施法者还会多滑一段 overshoot（收势不住）。
 *
 * 与同族分开：踢倒扫腿、下盘踢原地低弧、木槌自上而下砸地；百万吨重踢凭「大起手直线突进、把单体踢飞」认出来。
 * 提交后才触碰世界。
 */
namespace PokemonSkills {
    const megakickScene = "world_combat:move_megakick";
    const megakickLaunchText = "world_combat.move.megakick.text.launch";
    const megakickHitText = "world_combat.move.megakick.text.hit";
    const megakickMissText = "world_combat.move.megakick.text.miss";

    define({
        id: "megakick",
        name: "Mega Kick",
        description: "The target is attacked by a kick launched with muscle-packed power.",
        uses: ["一脚把单体目标踢出阵型", "用大起手逼对手让位，再收势", "对残血目标做一记终结式重踢"],
        kind: "enemy",
        range: 2.7,
        maxRange: 5.0,
        prepare: 14,
        active: 26,
        recover: 12,
        cooldown: 40,
        style: "contact",
        defaults: { launch: true, ai: { maxChase: 7, minHealth: 0.3, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("megakick", "collisionRadius", pokemon) * 1.5, geometry: "line", style: "contact",
                color: 0xD98B3A, label: config && config.launch === false ? "百万吨重踢·砸穿式" : "百万吨重踢" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["megakick"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const launch = !(config && config.launch === false);
            return {
                prepare: Math.round(p("megakick", "haul", context)),
                recover: Math.round(p("megakick", "aftercast", context)),
                cooldown: Math.round(p("megakick", "recharge", context)),
                active: skills["megakick"].active,
                range: (launch ? p("megakick", "lunge", context) : p("megakick", "lunge", context) * 0.9) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_megakick:haul", megakickScene, 1, action.origin(),
                JSON.stringify({ moment: "haul", launch: config && config.launch === false ? 0 : 1, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const length = p("megakick", "lunge", action);
            const pace = Math.max(0.2, p("megakick", "pace", action));
            const radius = p("megakick", "collisionRadius", action);
            const overshoot = Math.max(0.4, p("megakick", "overshoot", action));
            const launch = !(config && config.launch === false);
            const direction = aim(action);
            const self = world.observe(action.actor());
            const scale = self === null ? 1 : (self.width() + self.height()) / 2.3;
            let travelled = 0, overrun = false, settled = false;

            WorldFeedback.emit(world, megakickScene, 1, action.origin(),
                { moment: "drive", direction: [direction.x(), direction.y(), direction.z()],
                    stride: Math.max(3, Math.round(length / 0.55)), scale: scale, launch: launch ? 1 : 0 }, 30);
            sound(action, "minecraft:entity.player.attack.strong");

            function settle(current: CombatAction, moment: string, textKey: string): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    // The impact was already emitted at the actual hit point; settling must not create a second hit on the caster.
                    if (moment !== "impact") WorldFeedback.emit(scope, megakickScene, 1, body.position(), { moment: moment, scale: scale, stride: 4 }, 22);
                    if (textKey) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), textKey, [], 22);
                }
                sound(current, moment === "whiff" ? "minecraft:entity.player.attack.weak" : "cobblemon:impact.fighting");
                done(current);
            }

            /** 结算对一名目标的踢击：伤害 + 抛飞。目标体重只有在这里才读得到。 */
            function strike(current: CombatAction, target: CombatActor, point: CombatPoint): boolean {
                const scope = current.world();
                const context: NumberContext = { pokemon: CobblemonCombat.pokemon(current.actor()), skill: skills["megakick"],
                    detail: { values: config }, world: scope, actor: current.actor(), target: { world: scope, actor: target } };
                const power = p("megakick", "kick", context);
                const back = Math.max(0, p("megakick", "launchBack", context));
                const up = Math.max(0, p("megakick", "launchUp", context));
                const landed = hurt(current, target, "megakick", power, { damage: damageSpec("megakick", "kick"), contact: true });
                WorldFeedback.emit(scope, megakickScene, 1, point,
                    { moment: "impact", target: String(target.ref()), intensity: Math.max(0.7, Math.min(2.6, power / 110)),
                        force: back, launch: launch ? 1 : 0, scale: scale }, 26);
                if (landed && scope.valid(target)) {
                    const away = WorldCombat.point(direction.x(), 0, direction.z());
                    const heading = away.length() < 0.05 ? direction : away.unit();
                    if (scope.displace(target, WorldCombat.point(heading.x() * back, up, heading.z() * back)) > 0.1)
                        WorldFeedback.emit(scope, megakickScene, 1, point,
                            { moment: "launch", target: String(target.ref()), force: back, rise: up, scale: scale }, 28);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), megakickLaunchText, [], 22);
                } else {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), megakickHitText, [], 22);
                }
                return landed;
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const budget = length + (overrun ? overshoot : 0);
                const step = Math.min(pace, Math.max(0, budget - travelled));
                if (step <= 0.001) { settle(current, "whiff", megakickMissText); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(1.1)), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && !scope.friendly(target) && scope.valid(target)) {
                        strike(current, target, hit.position());
                        settle(current, "impact", "");
                        return;
                    }
                    settle(current, "whiff", megakickMissText);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < 0.05) { settle(current, "whiff", megakickMissText); return; }
                if (travelled >= length && !overrun) overrun = true;
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
