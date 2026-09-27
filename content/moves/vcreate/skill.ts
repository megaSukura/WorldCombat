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
 * 选取：`kind: "aim"`——可以指向任意阵营的实体或一个世界点，也能空冲；没有选中实体时就沿瞄准方向扑出去，
 *   撞到方块或冲满冲程就在那里收住，代价照付。伤害权限仍由命中层按敌我关系判断。
 *
 * 配置 `nova`（尽燃式）由 `resolve` 改时序与射程、由公式改威力／弹速／降级，提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 一直挂在动作上的前额 V 轮廓场景；两翼由客户端按真实 bodyYaw 每帧重算。 */
    const vcreateVScene = "world_combat:move_vcreate/v";

    /**
     * 用施法者当前真实朝向算出一组稳定基：forward 取水平 look，right/up 撑起额前 V 的横向与竖向。
     * 客户端优先按锚点 bodyYaw 实时重算，这里同时带上出生时的基作为无锚点时的兜底。
     */
    function vcreatePlacement(world: CombatWorld, actor: CombatActor, body: CombatObservation | null): any {
        const look = WorldGeometry.facing(world, actor);
        const heading = WorldGeometry.flatUnit(look === null ? WorldCombat.point(0, 0, 1) : look);
        const axis = WorldGeometry.basis(heading);
        return {
            forward: [axis.forward.x(), axis.forward.y(), axis.forward.z()],
            right: [axis.right.x(), axis.right.y(), axis.right.z()],
            up: [axis.up.x(), axis.up.y(), axis.up.z()],
            height: body === null ? 1.4 : body.height()
        };
    }

    define({
        freeMovement: true,
        id: vcreateId,
        cooldownParameter: "recharge",
        name: "V-create",
        description: "从前额生出灼热的火焰、把自身当弹丸撞出去：前额的火张成一个 V，整个人拖着这道 V 撞进目标怀里，命中爆成一团火。代价写在明面上——提交那一刻就把防御、特防、速度三段一起压下去，无论中与不中都照付。它是全项目威力最高的一档近身冲撞。",
        uses: ["前额起火、把自身当弹丸撞穿一个目标", "用一次最重的近身交换压血", "赌上机动性换最高一档的爆发"],
        kind: "aim",
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
            const body = action.sense().observe(action.actor());
            const flames = Math.round(p(vcreateId, "flames", action));
            const radius = p(vcreateId, "radius", action);
            const placement = vcreatePlacement(action.sense(), action.actor(), body);
            // 只在这里播一次起火预告，并把真实 prepare 作为时长；execute 不再重发 kindle。
            action.present("world_combat:move_vcreate:kindle", vcreateScene, 1, action.origin(),
                JSON.stringify({ moment: "kindle", windup: prepare, nova: config && config.nova === true ? 1 : 0,
                    flames: flames }));
            // 准备期的额前 V：客户端按 bodyYaw 实时跟随身体，转身时两翼仍在身前张开。
            action.present(vcreateVScene, vcreateVScene, 1, action.origin(),
                JSON.stringify({ moment: "kindle", windup: prepare, start: action.sense().tick(),
                    nova: config && config.nova === true ? 1 : 0, flames: flames, span: radius, rise: radius * 1.4,
                    scale: Math.max(0.6, Math.min(2.0, radius / 0.5)), forward: placement.forward, right: placement.right,
                    up: placement.up, height: placement.height }));
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

            // 舍身的代价在提交那一刻付：三段降级无论中与不中都照付；实际降幅受能力规则限制，回执只报真正落下的级数。
            const guardPaid = Math.max(0, -NativeEffects.boost(world, actor, "def", -guardLoss));
            const poisePaid = Math.max(0, -NativeEffects.boost(world, actor, "spd", -poiseLoss));
            const speedPaid = Math.max(0, -NativeEffects.boost(world, actor, "spe", -speedLoss));
            sound(action, "minecraft:item.firecharge.use");
            // 冲刺阶段：把额前 V 从准备切到全张，交给自定义场景按真实朝向跟随身体。
            const placement = vcreatePlacement(world, actor, world.observe(actor));
            action.present(vcreateVScene, vcreateVScene, 1, action.origin(),
                JSON.stringify({ moment: "dash", start: world.tick(), nova: nova ? 1 : 0, flames: flames,
                    span: radius, rise: radius * 1.4, scale: scale, intensity: intensity,
                    forward: placement.forward, right: placement.right, up: placement.up, height: placement.height }));

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
                        guardLoss: guardPaid, poiseLoss: poisePaid, speedLoss: speedPaid,
                        slump: 8 + (guardPaid + poisePaid + speedPaid) * 5 }, 26);
                WorldFeedback.text(scope, at.plus(up), vcreateSlumpText, [guardPaid, poisePaid, speedPaid], 30);
                // 收势的残焰 V：仍绑在身体上，按真实降级幅度压暗缩短；动作结束随动作清理。
                const slumpPlacement = vcreatePlacement(scope, actor, self);
                current.present(vcreateVScene, vcreateVScene, 1, at,
                    JSON.stringify({ moment: "slump", start: scope.tick(), flames: flames, scale: scale, intensity: intensity,
                        span: radius * 0.7, rise: radius, forward: slumpPlacement.forward, right: slumpPlacement.right,
                        up: slumpPlacement.up, height: slumpPlacement.height }));
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
                        // 接触瞬间把 V 碎散：真实接触点向外抛短段；carry 的 V 随即由 finish 切成残焰。
                        current.present("world_combat:move_vcreate:shatter", vcreateVScene, 1, at,
                            JSON.stringify({ moment: "shatter", start: scope.tick(),
                                direction: [direction.x(), direction.y(), direction.z()],
                                reach: radius, scale: scale, intensity: intensity }));
                        if (landed && scope.valid(victim)) scope.hitDisplace(victim, direction.scale(push));
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
