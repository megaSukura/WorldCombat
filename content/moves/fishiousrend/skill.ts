/**
 * 鳃咬 / fishiousrend 的出手方式。
 *
 * 核心念头：抢在对手反应之前扑上去，用坚硬的鳃一口咬住——只要这一口比对手先到，威力翻倍；
 * 咬住之后把猎物朝自己拖、并压住它的步伐。
 *
 * 三幕：
 *   起（coil，提交前）：鳃叶张开、水汽在嘴边聚成一层（present coil）。
 *   扑（lunge）：逐刻朝目标扑近，途中第一个近敌优先；也可选中一个空点直扑。
 *   咬（bite / clamp → reel / press）：咬上的一刻结算 rend，受击/拖动/减速统一取实际咬中的那个身体；
 *       目标尚未打过施法者时翻倍，画面换成更重的水花并浮出「先咬住！」；
 *       随后沿真实 drag 收拢两片鳃刃之间的水线，把猎物一节节拖近；若拖不动（免位移）只压出一记短咬。
 *
 * 选取：`kind: "aim"`——实体追近为核心，也可选一个空点直扑；target 为 null 时不假咬，只扑空收势。
 *
 * 与同族分开：电喙是点到即走的直线电啄；鳃咬是贴身咬合、拖拽压速，把猎物钉在原地。
 */
namespace PokemonSkills {
    const fishiousrendClampText = "world_combat.move.fishiousrend.text.clamp";
    const fishiousrendHitText = "world_combat.move.fishiousrend.text.hit";
    const fishiousrendSlowText = "world_combat.move.fishiousrend.text.slow";
    const fishiousrendMissText = "world_combat.move.fishiousrend.text.miss";

    define({
        freeMovement: true,
        id: fishiousrendId,
        cooldownParameter: "recharge",
        name: "Fishious Rend",
        description: "抢在对手反应之前扑上去，用坚硬的鳃一口咬住：目标尚未打过施法者时威力翻倍；咬住后沿实际咬中的身体把目标拖近并压低它的速度。",
        uses: ["抢在对手出手前咬住", "把目标拖回自己身边", "咬住后压低猎物速度"],
        kind: "aim",
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
            const scenes = WorldFeedback.actionScenes(fishiousrendScene);
            // 扑咬贴地走：方向取水平分量，避免身体贴着地面时被地面挡下。
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction0 = flat.length() > 0.001 ? flat.unit() : aimed;
            const length = p(fishiousrendId, "lunge", action);
            const step = p(fishiousrendId, "speed", action);
            const radius = p(fishiousrendId, "collisionRadius", action);
            const drag = p(fishiousrendId, "drag", action);
            const slowStages = Math.round(p(fishiousrendId, "slowStages", action));
            const minimumMove = p(fishiousrendId, "minimumMove", action);
            const scale = radius / 0.5;
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            function miss(current: CombatAction): void {
                if (settled) return;
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, fishiousrendScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), fishiousrendMissText, [], 22);
                }
                finish(current);
            }

            /** 沿真实 drag 收拢鳃口路径：一节节把实际咬中的猎物拖近，水线随之收短；拖不动只短咬压。 */
            function reel(current: CombatAction, victim: CombatActor, remaining: number, total: number): void {
                if (settled) return;
                const scope = current.world();
                if (remaining <= 0.001 || !scope.valid(victim)) { finish(current); return; }
                const self = scope.observe(current.actor()), prey = scope.observe(victim);
                if (self === null || prey === null) { finish(current); return; }
                const toward = self.position().minus(prey.position());
                const chunk = Math.min(0.35, remaining);
                let moved = 0;
                if (toward.length() > 0.05) moved = scope.displace(victim, toward.unit().scale(chunk));
                if (moved < 0.02) {
                    if (total - remaining <= 0.001) {
                        // 免位移：只压出一记短咬，不播水线收拢。
                        WorldFeedback.emit(scope, fishiousrendScene, 1, prey.position(), { moment: "press", target: String(victim.ref()), scale: scale }, 22);
                    }
                    finish(current);
                    return;
                }
                scenes.show(current, "reel", prey.position(),
                    { moment: "reel", target: String(victim.ref()), self: String(current.actor().ref()),
                        path: [String(victim.ref()), String(current.actor().ref())],
                        dragged: Math.round((total - remaining + moved) * 100) / 100, scale: scale });
                current.after(1, function (later: CombatAction) { reel(later, victim, remaining - moved, total); });
            }

            function bite(current: CombatAction, victim: CombatActor, point: CombatPoint, contact: CombatImpact): void {
                const scope = current.world();
                if (!scope.valid(victim)) { miss(current); return; }
                const power = p(fishiousrendId, "rend", current);
                // 先咬住与威力都只按实际咬中的那个身体判断。
                const doubled = fishiousrendLead(withTarget(factContext(current), victim)) > 0;
                const count = Math.round(14 + power / 3);
                const landed = impact(current, contact, fishiousrendId, power,
                    { damage: damageSpec(fishiousrendId, "rend"), contact: true, bite: true });
                // 伤害被拒绝时不冒称咬住、不拖拽、不减速。
                if (!landed) { finish(current); return; }
                WorldFeedback.emit(scope, fishiousrendScene, 1, point,
                    { moment: doubled ? "clamp" : "bite", target: String(victim.ref()), doubled: doubled ? 1 : 0,
                        power: Math.round(power * 10) / 10, count: count, slow: slowStages, scale: scale }, 28);
                scope.sound(doubled ? "cobblemon:move.crunch.target" : "cobblemon:impact.water", point, 16, "{}");
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)),
                    doubled ? fishiousrendClampText : fishiousrendHitText, [], 24);
                // 受击、拖动与减速统一指向同一个实际咬中的身体。
                NativeEffects.boost(scope, victim, "spe", -slowStages);
                if (slowStages > 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.45, 0)), fishiousrendSlowText, [], 22);
                reel(current, victim, drag, drag);
            }

            sound(action, "minecraft:entity.frog.long_jump");

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                // 目标可为 null（空点直扑）：此时朝 targetPosition 的落点走，走完收势，不假咬。
                let goal = current.targetPosition();
                const victim = current.target();
                if (victim !== null && scope.valid(victim)) {
                    const prey = scope.observe(victim);
                    if (prey !== null) goal = prey.position();
                }
                const delta = goal.minus(here);
                const flatDelta = WorldCombat.point(delta.x(), 0, delta.z());
                const heading = flatDelta.length() > 0.01 ? flatDelta.unit() : direction0;
                if (delta.length() <= radius + 0.6) {
                    const contact = current.trace(here, here.plus(heading.scale(radius + 0.6)), radius);
                    const other = contact.hitEntity() ? contact.target() : null;
                    if (other !== null && scope.valid(other) && !scope.friendly(other)) { bite(current, other, contact.position(), contact); return; }
                    miss(current);
                    return;
                }
                if (travelled >= length) { miss(current); return; }
                const move = Math.min(step, length - travelled);
                const swept = sweepStep(current, heading.scale(move), radius), hit = swept.hit;
                // 途中首敌优先：moveSweep 在第一个到达的敌人处停下，咬的就是它。
                if (hit.hitEntity()) {
                    const caught = hit.target();
                    if (caught !== null && scope.valid(caught) && !scope.friendly(caught)) { bite(current, caught, hit.position(), hit); return; }
                }
                const moved = swept.moved;
                travelled += moved;
                const body = scope.observe(current.actor());
                if (body !== null) scenes.show(current, "lunge", body.position(),
                    { moment: "lunge", direction: [heading.x(), heading.y(), heading.z()],
                        charge: Math.min(1, travelled / Math.max(0.001, length)), scale: scale });
                if (hit.blocked() || moved < minimumMove) { miss(current); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
