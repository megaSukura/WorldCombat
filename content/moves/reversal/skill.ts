/**
 * 起死回生 / reversal 的出手方式。
 *
 * 念头的形状：站住把余力全提到脚下，身周的伤口亮成一道橙红光（windup，提交前只播预告，血越少越亮）→
 * 贴到对手身下（lunge）→ 落地的一刻从身下喷出一道格斗系光柱，把周围一圈敌人一起掀开（burst）→ 收势（spent）。
 * 自己越接近倒下，光柱越高、喷发圈越宽；圈里没有敌人时只剩一道空喷（fade）。拼命式在每次打中后按最大生命反噬。
 *
 * 两幕半：brace（站定提力）→ lunge → burst / fade。提交后才触碰世界。
 */
namespace PokemonSkills {
    const reversalScene = "world_combat:move_reversal";
    const reversalBurstText = "world_combat.move.reversal.text.burst";
    const reversalSpentText = "world_combat.move.reversal.text.spent";
    const reversalFadeText = "world_combat.move.reversal.text.fade";

    function reversalAim(action: CombatAction): CombatPoint {
        const wanted = action.targetPosition().minus(action.origin());
        return wanted.length() < 0.01 ? action.direction() : wanted.unit();
    }

    function reversalVector(direction: CombatPoint): number[] { return [direction.x(), direction.y(), direction.z()]; }

    define({
        freeMovement: true,
        id: "reversal",
        name: "Reversal",
        description: "背水一喷：站住把余力提到脚下，扑向对手后从落点掀开一圈格斗光柱，把圈内的敌人一起向外掀开。自己越接近倒下，威力与喷发圈越大。",
        uses: ["残血时反打一记大的", "把围上来的敌人一起掀开", "拼命式赌一记重伤"],
        kind: "enemy",
        range: 3.0,
        maxRange: 5.2,
        prepare: 10,
        active: 22,
        recover: 10,
        cooldown: 34,
        style: "gamble",
        defaults: { reckless: false, ai: { maxChase: 7, desperate: 0.55, finish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("reversal", "burstRadius", pokemon), geometry: "area", style: "gamble", color: 0xE8603C, label: "起死回生" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["reversal"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const reckless = !!(config && config.reckless);
            return {
                prepare: p("reversal", "plant", context),
                recover: p("reversal", "recover", context) + (reckless ? 2 : 0),
                cooldown: p("reversal", "cooldown", context) + (reckless ? 8 : 0),
                range: p("reversal", "lunge", context) + p("reversal", "burstRadius", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            const reckless = !!(config && config.reckless);
            const wound = p("reversal", "wound", action);
            action.present("world_combat:move_reversal:brace", reversalScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", windup: prepare, wound: wound, embers: Math.max(6, Math.round(10 + wound * 26)), reckless: reckless }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const foe = action.target();
            const reckless = !!(config && config.reckless);
            const power = p("reversal", "power", action);
            const wound = p("reversal", "wound", action);
            const burstRadius = p("reversal", "burstRadius", action);
            const lunge = p("reversal", "lunge", action);
            const lungeSpeed = p("reversal", "lungeSpeed", action);
            const radius = p("reversal", "collisionRadius", action);
            const push = p("reversal", "push", action);
            const recoil = p("reversal", "recoil", action);
            const direction = reversalAim(action);
            const scale = burstRadius / 1.2;
            const start = world.observe(self);
            if (start === null) { done(action); return; }
            const budget = lunge + 0.4;
            let travelled = 0, settled = false;
            let heading = direction;

            WorldFeedback.emit(world, reversalScene, 1, action.origin(),
                { moment: "press", direction: reversalVector(direction), scale: scale, wound: wound }, 30);
            sound(action, "minecraft:entity.evoker.prepare_attack");

            /** 喷发：以自身落点为心掀开一圈，圈里每个敌人独立结算一次伤害并向外顶开。 */
            function erupt(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                const center = body === null ? current.origin() : body.position();
                const near = scope.query(center, burstRadius, false);
                let landed = 0;
                for (let index = 0; index < near.length; index++) {
                    const other = near[index];
                    if (String(other.ref()) === String(self.ref()) || scope.friendly(other) || !scope.valid(other)) continue;
                    if (!hurt(current, other, "reversal", power, { damage: damageSpec("reversal", "power"), contact: true })) continue;
                    landed++;
                    const observed = scope.observe(other);
                    if (observed !== null) {
                        const outward = observed.position().minus(center);
                        const away = outward.length() < 0.01 ? current.direction() : outward.unit();
                        scope.displace(other, away.scale(push));
                    }
                }
                WorldFeedback.emit(scope, reversalScene, 1, center,
                    { moment: landed > 0 ? "burst" : "fade", count: landed, scale: scale, wound: wound, power: power }, 30);
                if (landed > 0) {
                    sound(current, "cobblemon:impact.fighting");
                    if (foe !== null && scope.valid(foe))
                        WorldFeedback.text(scope, center.plus(WorldCombat.point(0, 1.3, 0)), reversalBurstText, [landed, Math.round(power)], 26);
                    if (reckless) {
                        const me = scope.observe(self);
                        if (me !== null) {
                            scope.health(self, -me.maxHealth() * recoil, "world_combat:reversal_recoil");
                            WorldFeedback.emit(scope, reversalScene, 1, me.position(), { moment: "spent", scale: scale, wound: wound }, 18);
                            WorldFeedback.text(scope, me.position().plus(WorldCombat.point(0, 1.15, 0)), reversalSpentText, [], 22);
                        }
                    }
                } else {
                    WorldFeedback.text(scope, center.plus(WorldCombat.point(0, 1.2, 0)), reversalFadeText, [], 22);
                    sound(current, "minecraft:entity.player.attack.sweep");
                }
                done(current);
            }

            /** 扑身：贴到喷发半径之内就掀；走完预算或撞墙也掀（可能掀空）。 */
            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const goal = current.targetPosition();
                const gap = goal.minus(origin).length();
                if (gap > 0.01) heading = goal.minus(origin).unit();
                if (gap <= burstRadius + 0.15) { erupt(current); return; }
                const step = Math.min(lungeSpeed, Math.max(0, budget - travelled));
                if (step <= 0.01) { erupt(current); return; }
                const hit = current.trace(origin, origin.plus(heading.scale(Math.max(step, radius) + 0.3)), radius);
                const moved = scope.displace(current.actor(), heading.scale(step));
                travelled += moved;
                if (hit.blocked() || moved < p("reversal", "minimumMove", current)) { erupt(current); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
