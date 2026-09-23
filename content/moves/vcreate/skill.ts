/**
 * Ｖ热焰 / vcreate 的出手方式。
 *
 * 核心念头：**把自身当弹丸的舍身撞击**——前额先炸开一团炽白的火、火舌向两侧张成一个 V，随后整个人拖着这道 V
 *   撞进目标怀里；撞完火焰萎落，V 收成两条残焰，而自己的防御、特防、速度一起垮下去。它卖的是「一次最重的
 *   近身交换」，代价写在明面上：**提交那一刻**就付出三段降级，无论中与不中都照付。
 *
 * 三幕（提交前只播预告）：
 *   起（windup，提交前）：前额起了火、火舌张成 V，身体压低，只播预告，此时代价未结清。
 *   冲（hurl）：提交后立刻把自身防御 −guardLoss、特防 −poiseLoss、速度 −speedLoss 写进公共能力阶梯，并沿瞄准
 *       方向扑出去（每刻推进 `rush`，最远 `charge`）；每刻扫过前进的一段，撞上非友方活体就结算 `flare` 接触伤害、
 *       把目标撞开 `push`。
 *   萎（slump / miss）：火焰萎落成两条残焰，浮字提示三段降级；落空只多一声扑空与扬尘。
 *
 * 与同族分开：蛮力降攻防并在地面留坑、近身战是一串快拳、十万马力用体重平地冲撞不留东西；Ｖ热焰是唯一同时
 *   压上防御、特防、速度三段的近身冲撞，也是威力最高的一记。玩家凭「前额那道 V 形火 + 撞完自己又慢又脆」认出它。
 *
 * 配置 `nova`（尽燃式）由 `resolve` 改时序与射程、由公式改威力／弹速／降级，提交后才触碰世界。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: vcreateId,
        cooldownParameter: "recharge",
        name: "V-create",
        description: "从前额生出灼热的火焰、把自身当弹丸撞出去：前额的火张成一个 V，整个人拖着这道 V 撞进目标怀里，命中爆成一团火。代价写在明面上——提交那一刻就把防御、特防、速度三段一起压下去，无论中与不中都照付。它是全项目威力最高的一档近身冲撞。",
        uses: ["前额起火、把自身当弹丸撞穿一个目标", "用一次最重的近身交换压血", "赌上机动性换最高一档的爆发"],
        kind: "enemy",
        range: 3.8,
        maxRange: 6.5,
        prepare: 10,
        active: 0,
        recover: 12,
        cooldown: 50,
        maximumTicks: 240,
        style: "impact",
        defaults: { nova: false, ai: { maxChase: 10, opener: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(vcreateId, "charge", pokemon) : 3.8, geometry: "line", style: "impact",
                color: 0xFF5A2E, label: config && config.nova === true ? "尽燃式Ｖ热焰" : "收焰式Ｖ热焰" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[vcreateId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(vcreateId, "tempo", context)),
                recover: Math.round(p(vcreateId, "aftercast", context)),
                cooldown: Math.round(p(vcreateId, "recharge", context)),
                active: 0,
                range: p(vcreateId, "charge", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_vcreate:kindle", vcreateScene, 1, action.origin(),
                JSON.stringify({ moment: "kindle", nova: config && config.nova === true ? 1 : 0,
                    flames: Math.round(p(vcreateId, "flames", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(vcreateScene);
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const flare = p(vcreateId, "flare", action);
            const charge = p(vcreateId, "charge", action);
            const rush = p(vcreateId, "rush", action);
            const radius = p(vcreateId, "radius", action);
            const push = p(vcreateId, "push", action);
            const flames = Math.max(12, Math.round(p(vcreateId, "flames", action)));
            const guardLoss = Math.max(0, Math.round(p(vcreateId, "guardLoss", action)));
            const poiseLoss = Math.max(0, Math.round(p(vcreateId, "poiseLoss", action)));
            const speedLoss = Math.max(0, Math.round(p(vcreateId, "speedLoss", action)));
            const minimumMove = p(vcreateId, "minimumMove", action);
            const nova = !!(config && config.nova);
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.5));
            const intensity = Math.max(0.6, Math.min(2.6, flare / 180));
            const up = WorldCombat.point(0, 1.3, 0);
            let travelled = 0, struck = false, settled = false;

            // 舍身的代价在提交那一刻付：三段降级无论中与不中都照付。
            NativeEffects.boost(world, actor, "def", -guardLoss);
            NativeEffects.boost(world, actor, "spd", -poiseLoss);
            NativeEffects.boost(world, actor, "spe", -speedLoss);
            sound(action, "minecraft:item.firecharge.use");
            WorldFeedback.emit(world, vcreateScene, 1, action.origin(),
                { moment: "kindle", nova: nova ? 1 : 0, flames: flames, scale: scale, intensity: intensity,
                    guardLoss: guardLoss, poiseLoss: poiseLoss, speedLoss: speedLoss }, 22);

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                if (!struck) {
                    WorldFeedback.emit(scope, vcreateScene, 1, at, { moment: "miss", flames: flames, scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), vcreateMissText, [], 20);
                    sound(current, "minecraft:block.gravel.break");
                }
                WorldFeedback.emit(scope, vcreateScene, 1, at,
                    { moment: "slump", flames: flames, scale: scale, intensity: intensity, landed: struck ? 1 : 0,
                        guardLoss: guardLoss, poiseLoss: poiseLoss, speedLoss: speedLoss }, 26);
                WorldFeedback.text(scope, at.plus(up), vcreateSlumpText, [guardLoss, poiseLoss, speedLoss], 30);
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const remaining = charge - travelled;
                if (remaining <= 0.001) { finish(current); return; }
                const delta = direction.scale(Math.min(rush, remaining));
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        struck = true;
                        const at = hit.position();
                        const landed = impact(current, hit, vcreateId, flare,
                            { damage: damageSpec(vcreateId, "flare"), contact: true });
                        WorldFeedback.emit(scope, vcreateScene, 1, at,
                            { moment: "impact", target: String(victim.ref()), nova: nova ? 1 : 0, flames: flames,
                                scale: scale, intensity: intensity }, 30);
                        if (landed && scope.valid(victim)) scope.displace(victim, direction.scale(push));
                        scope.sound("cobblemon:impact.fire", at, 15, "{}");
                        scope.sound("minecraft:entity.generic.explode", at, 12, "{}");
                        finish(current);
                        return;
                    }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
                travelled += moved;
                movementScenes.show(current, "hurl", origin, { moment: "hurl", nova: nova ? 1 : 0, flames: flames, scale: scale, intensity: intensity,
                        progress: Math.min(1, travelled / Math.max(0.001, charge)) });
                if (hit.blocked() || moved < minimumMove || travelled >= charge) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next); });
            }

            advance(action);
        }
    });
}
