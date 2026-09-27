/**
 * 小偷 / thief —— 注册与动作。
 *
 * 念头两幕：一幕压身探手（提交前 `windup`，低伏、手探向前，火花沿指尖聚起），一幕贴身掠过（提交后沿瞄准方向
 * 逐刻推进，撞上活体的一刻结算接触伤害；命中时重新验空手、接收槽仍空，原子转移才把对手手里的道具换进自己手里，
 * 物品贴图从真实接触点飞回施法者）。自己手上有物（含途中获得）或对手空手时，只当一记普通打击。
 * 得手后按 `flee` 沿原生 displace 的实际退回距离向后拉开一段；没得手就留在对方身边继续压。
 * 道具交换走统一的原生装备事务（equipmentExchange，`firstEmpty` 前置条件）：宝可梦携带物与原版生物/玩家的主副手同一契约，
 * 两边快照核对通过才写入，被查封（embargo）者不参与转手；不做任何“复制”或凭空生成。物品回执由效果自有的客户端图形承载。
 */
namespace PokemonSkills {
    const thiefScene = "world_combat:move_thief";
    const thiefFlowScene = "world_combat:move_thief_flow";
    const thiefStealText = "world_combat.move.thief.text.steal";
    const thiefStrikeText = "world_combat.move.thief.text.strike";
    const thiefFullText = "world_combat.move.thief.text.full";
    const thiefMissText = "world_combat.move.thief.text.miss";

    /** 探手：从身体沿真实接触段短伸再收回，固定一枚贴图，不生成粒子或实体。 */
    function thiefHand(current: CombatAction, point: CombatPoint): void {
        var scope = current.world(), body = scope.observe(current.actor());
        var from = body === null ? current.origin() : body.position();
        WorldFeedback.emit(scope, thiefFlowScene, 1, point,
            { moment: "reach", from: [from.x(), from.y() + 0.3, from.z()], at: [point.x(), point.y() + 0.15, point.z()],
                start: scope.tick(), dur: 9 }, 15);
    }

    /** 得手后的实际后撤：沿真实退回段画一段短探手收回与脚印，距离取原生 displace 的实际值。 */
    function thiefBack(current: CombatAction, point: CombatPoint, distance: number): void {
        var scope = current.world(), body = scope.observe(current.actor());
        var to = body === null ? current.origin() : body.position();
        WorldFeedback.emit(scope, thiefFlowScene, 1, to,
            { moment: "back", from: [point.x(), point.y() + 0.3, point.z()], at: [to.x(), to.y() + 0.3, to.z()],
                start: scope.tick(), dur: 10, back: distance }, 18);
    }

    /** 得手的物品回执：道具已经在手里，这里只把物品贴图从真实接触点送回施法者，独立于动作弹。 */
    function thiefHome(current: CombatAction, point: CombatPoint, itemId: string): void {
        var scope = current.world();
        WorldFeedback.emit(scope, thiefFlowScene, 1, point,
            { moment: "homeward", item: itemId, target: String(current.actor().ref()),
                from: [point.x(), point.y() + 0.3, point.z()], start: scope.tick(), dur: 18 }, 30);
    }

    function thiefStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        const movementScenes = WorldFeedback.actionScenes(thiefScene);
        var world = action.world(), actor = action.actor();
        var direction = aim(action), length = p("thief", "reach", action), speed = p("thief", "step", action);
        var radius = p("thief", "collisionRadius", action), push = p("thief", "push", action);
        var slip = p("thief", "slip", action), motes = p("thief", "motes", action);
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var own = thiefHeldOf(world, actor), emptyHanded = own === null;
        sound(action, "cobblemon:move.quickattack.actor");
        movementScenes.show(action, "reach", action.origin(), { moment: "reach", scale: scale, motes: Math.round(motes), armed: emptyHanded ? 0 : 1 });
        var travelled = 0;
        function advance(current: CombatAction): void {
            var scope = current.world(), origin = current.origin();
            var delta = direction.scale(Math.min(speed, length - travelled));
            var swept = sweepStep(current, delta, radius);
            var hit = swept.hit;
            if (hit.hitEntity()) {
                var target = hit.target();
                if (target === null || scope.friendly(target)) { movementScenes.finish(current, done); return; }
                var point = hit.position();
                var before = scope.observe(target), dealt = 0, maximum = 1;
                maximum = before ? Math.max(1, before.maxHealth()) : 1;
                var power = p("thief", "swipe", current);
                thiefHand(current, point);
                var landed = impact(current, hit, "thief", power, { damage: damageSpec("thief", "swipe"), contact: true });
                var after = scope.valid(target) ? scope.observe(target) : null;
                dealt = before ? before.health() - (after ? after.health() : 0) : 0;
                var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
                var stolen = false, itemId = "";
                // 命中时重新验空手并由原生 CAS 要求接收槽仍空；途中自己获物、或目标已倒下则退回普通打击。
                if (landed && after !== null && after.health() > 0 && !NativeItems.sealed(scope, actor) && !NativeItems.sealed(scope, target)) {
                    var theirs = thiefHeldOf(scope, target);
                    if (theirs !== null && NativeItems.exchangeHeld(scope, actor, target, 1, { firstEmpty: true }).ok) {
                        stolen = true; itemId = theirs.id;
                    }
                }
                sound(current, "cobblemon:impact.dark");
                if (landed) {
                    WorldFeedback.emit(scope, thiefScene, 1, point, { moment: stolen ? "snatch" : "strike", target: String(target.ref()),
                        item: itemId, intensity: intensity, scale: scale, motes: Math.round(motes * (0.7 + intensity * 0.2)) }, 30);
                    scope.hitDisplace(target, direction.scale(push));
                    if (stolen) {
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), thiefStealText, [], 30);
                        sound(current, "minecraft:entity.item.pickup");
                        thiefHome(current, point, itemId);
                        if (slip > 0.05) {
                            var slipped = scope.displace(actor, direction.scale(-slip));
                            if (slipped > 0.01) thiefBack(current, point, slipped);
                        }
                    } else {
                        var nowEmpty = thiefHeldOf(scope, actor) === null;
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), nowEmpty ? thiefStrikeText : thiefFullText, [], 28);
                    }
                } else {
                    // 原生拒绝这次伤害：不报普通击成功。
                    WorldFeedback.emit(scope, thiefScene, 1, point, { moment: "resist", target: String(target.ref()), scale: scale }, 22);
                    scope.sound("minecraft:entity.player.attack.weak", point, 12, "{}");
                }
                movementScenes.finish(current, done);
                return;
            }
            var moved = swept.moved;
            travelled += moved;
            if (hit.blocked() || moved < p("thief", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(scope, thiefScene, 1, hit.position(), { moment: "miss", scale: scale }, 20);
                var self = scope.observe(actor);
                if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.1, 0)), thiefMissText, [], 22);
                movementScenes.finish(current, done);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: "thief",
        name: "小偷",
        description: "压低身子探手掠过：命中时若自己空手，就把对手的持有物卷进自己手里；自己持物时只当普通一击。手越快的个体探得更远、退得更利落。",
        uses: ["把对手的持有物偷过来", "空手时的一次快速近身打击", "得手后退开拉开距离"],
        kind: "enemy",
        range: 3,
        maxRange: 5,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "dash",
        defaults: { flee: false, ai: { maxChase: 12, leaveStation: false } },
        fields: [flag("flee", "得手即退")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["thief"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var flee = !!(config && config.flee);
            return { prepare: Math.round(p("thief", "charge", context)), recover: 6 + (flee ? 4 : 0), cooldown: 22, active: 0,
                range: p("thief", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var emptyHanded = thiefHeldOf(action.sense(), action.actor()) === null;
            action.present("world_combat:thief:" + action.id(), thiefScene, 1, action.origin(), JSON.stringify({
                moment: "reach", scale: scale, armed: emptyHanded ? 0 : 1 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            thiefStrike(action, done);
        },
        indicator: function () { return { radius: 3, geometry: "line", style: "dash", label: "小偷" }; }
    });
}
