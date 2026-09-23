/**
 * 鳃咬 / fishiousrend 的出手方式。
 *
 * 核心念头：抢在对手反应之前扑上去，用坚硬的鳃一口咬住——只要这一口比对手先到，威力翻倍；
 * 咬住之后把猎物朝自己拖、并压住它的步伐。
 *
 * 两幕：
 *   起（windup，提交前）：鳃叶张开、水汽在嘴边聚成一层（present coil）。
 *   咬（execute）：逐刻朝目标扑近，咬上的一刻结算 rend；目标尚未打过施法者时翻倍，
 *       画面换成更重的水花并浮出「先咬住！」；随后把目标拖向自己并压低它的速度。
 *
 * 与同族分开：电喙是点到即走的直线电啄；鳃咬是贴身咬合、拖拽压速，把猎物钉在原地。
 */
namespace PokemonSkills {
    const fishiousrendClampText = "world_combat.move.fishiousrend.text.clamp";
    const fishiousrendHitText = "world_combat.move.fishiousrend.text.hit";
    const fishiousrendSlowText = "world_combat.move.fishiousrend.text.slow";
    const fishiousrendMissText = "world_combat.move.fishiousrend.text.miss";

    define({
        id: fishiousrendId,
        cooldownParameter: "recharge",
        name: "Fishious Rend",
        description: "抢先扑上去用坚硬的鳃咬住目标：目标尚未打过施法者时威力翻倍；咬住后把目标拖近并压低它的速度。",
        uses: ["抢在对手出手前咬住", "把目标拖回自己身边", "咬住后压低猎物速度"],
        kind: "enemy",
        range: 3.2,
        maxRange: 6,
        prepare: 6,
        active: 0,
        recover: 9,
        cooldown: 28,
        style: "water",
        defaults: { deepbite: false, ai: { maxChase: 8, leadFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(fishiousrendId, "collisionRadius", pokemon) * 1.5, geometry: "line", style: "water", color: 0x4AA6D8,
                label: config && config.deepbite === true ? "鳃咬·深咬" : "鳃咬" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[fishiousrendId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(fishiousrendId, "tempo", context)),
                recover: Math.round(p(fishiousrendId, "settle", context)),
                cooldown: Math.round(p(fishiousrendId, "recharge", context)),
                active: 0,
                range: p(fishiousrendId, "lunge", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("fishiousrend:coil", fishiousrendScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", deepbite: config && config.deepbite === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const length = p(fishiousrendId, "lunge", action);
            const step = p(fishiousrendId, "speed", action);
            const radius = p(fishiousrendId, "collisionRadius", action);
            const drag = p(fishiousrendId, "drag", action);
            const slowStages = Math.round(p(fishiousrendId, "slowStages", action));
            const scale = radius / 0.5;
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function miss(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, fishiousrendScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), fishiousrendMissText, [], 22);
                }
                finish(current);
            }

            function bite(current: CombatAction, victim: CombatActor, point: CombatPoint, contact: CombatImpact): void {
                const scope = current.world();
                if (!scope.valid(victim)) { finish(current); return; }
                const power = p(fishiousrendId, "rend", current);
                const doubled = fishiousrendLead(factContext(current)) > 0;
                const count = Math.round(14 + power / 3);
                const landed = impact(current, contact, fishiousrendId, power,
                    { damage: damageSpec(fishiousrendId, "rend"), contact: true, bite: true });
                if (landed && scope.valid(victim)) {
                    const self = scope.observe(current.actor()), prey = scope.observe(victim);
                    if (self !== null && prey !== null) {
                        const toward = self.position().minus(prey.position());
                        if (toward.length() > 0.05) scope.displace(victim, toward.unit().scale(drag));
                    }
                    NativeEffects.boost(scope, victim, "spe", -slowStages);
                }
                WorldFeedback.emit(scope, fishiousrendScene, 1, point,
                    { moment: doubled ? "clamp" : "bite", target: String(victim.ref()), doubled: doubled ? 1 : 0,
                        power: Math.round(power * 10) / 10, count: count, slow: slowStages, scale: scale }, 28);
                scope.sound(doubled ? "cobblemon:move.crunch.target" : "cobblemon:impact.water", point, 16, "{}");
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)),
                    doubled ? fishiousrendClampText : fishiousrendHitText, [], 24);
                if (landed && slowStages > 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.45, 0)), fishiousrendSlowText, [], 22);
                finish(current);
            }

            sound(action, "minecraft:entity.frog.long_jump");

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const victim = current.target();
                if (victim === null || !scope.valid(victim)) { miss(current); return; }
                const prey = scope.observe(victim);
                if (prey === null) { miss(current); return; }
                const at = prey.position(), delta = at.minus(here);
                if (delta.length() <= radius + 0.6) {
                    const contact = current.trace(here, at, radius);
                    if (contact.hitEntity()) { bite(current, victim, at, contact); return; }
                    miss(current); return;
                }
                if (travelled >= length) { miss(current); return; }
                const move = Math.min(step, length - travelled);
                const direction = delta.unit();
                const hit = current.trace(here, here.plus(direction.scale(move + p(fishiousrendId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const caught = hit.target();
                    if (caught !== null && scope.valid(caught) && !scope.friendly(caught)) { bite(current, caught, hit.position(), hit); return; }
                }
                const moved = scope.displace(current.actor(), direction.scale(move));
                travelled += moved;
                if (hit.blocked() || moved < p(fishiousrendId, "minimumMove", current)) { miss(current); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
