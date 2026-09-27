/**
 * 渴望 / covet —— 注册与动作。
 *
 * 念头：一边可爱地撒娇一边蹭近，趁对手被分了神把它的持有物卷走；每一记落地都让对手攻势软一拍。
 * 两幕：
 *   起（windup，提交前）：心形光点在头顶飘起，指尖向内聚粉光——预告这份撒娇。
 *   贴（execute，提交后）：缓缓蹭过去，撞上活体的一刻结算接触伤害；落地即让目标攻击按实际等级下降（有礼时 −2），
 *       命中时再验一次自己是否空手、接收槽是否仍空，用原子转移把道具换进手里——真实取物与降攻各自回执。
 *       自己手上有物（含途中获得）或对手空手时，只当一记会降攻的普通打击。
 * 与同为“偷取”的小偷分开：本招走一般属性、更慢更软、不退反贴，用持续的降攻换手；小偷走恶属性、更快更重、可退可压。
 * 道具交换走统一原生装备事务（`equipmentExchange`，`firstEmpty` 前置条件）；宝可梦携带物与原版生物/玩家主副手同一契约；
 * 被查封（embargo）者不参与转手；不复制、不凭空生成。物品回执由效果自有的客户端图形承载，不再依赖动作弹。
 */
namespace PokemonSkills {
    const covetScene = "world_combat:move_covet";
    const covetFlowScene = "world_combat:move_covet_flow";
    const covetStealText = "world_combat.move.covet.text.steal";
    const covetCharmText = "world_combat.move.covet.text.charm";
    const covetStrikeText = "world_combat.move.covet.text.strike";
    const covetFullText = "world_combat.move.covet.text.full";
    const covetMissText = "world_combat.move.covet.text.miss";

    /** 贴上那只手：从身体沿真实接触段短伸再收回，固定一枚贴图，不生成粒子或实体。 */
    function covetHand(current: CombatAction, point: CombatPoint): void {
        var scope = current.world(), body = scope.observe(current.actor());
        var from = body === null ? current.origin() : body.position();
        WorldFeedback.emit(scope, covetFlowScene, 1, point,
            { moment: "reach", from: [from.x(), from.y() + 0.35, from.z()], at: [point.x(), point.y() + 0.1, point.z()],
                start: scope.tick(), dur: 10 }, 16);
    }

    /** 得手后的物品回执：道具此刻已经在手里，这里只把一枚物品贴图从真实接触点送回施法者，独立于动作弹。 */
    function covetHome(current: CombatAction, point: CombatPoint, itemId: string): void {
        var scope = current.world();
        WorldFeedback.emit(scope, covetFlowScene, 1, point,
            { moment: "homeward", item: itemId, target: String(current.actor().ref()),
                from: [point.x(), point.y() + 0.3, point.z()], start: scope.tick(), dur: 18 }, 30);
    }

    function covetGlide(action: CombatAction, done: (current: CombatAction) => void): void {
        const movementScenes = WorldFeedback.actionScenes(covetScene);
        var world = action.world(), actor = action.actor();
        var direction = aim(action), length = p("covet", "reach", action), speed = p("covet", "step", action);
        var radius = p("covet", "radius", action), push = p("covet", "push", action);
        var soften = Math.max(1, Math.round(p("covet", "soften", action)));
        var hearts = p("covet", "hearts", action);
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var own = covetHeldOf(world, actor), emptyHanded = own === null;
        sound(action, "cobblemon:move.quickattack.actor");
        movementScenes.show(action, "approach", action.origin(), { moment: "approach", scale: scale, hearts: Math.round(hearts), armed: emptyHanded ? 0 : 1 });
        var travelled = 0;
        function advance(current: CombatAction): void {
            var scope = current.world(), origin = current.origin();
            var delta = direction.scale(Math.min(speed, length - travelled));
            var swept = sweepStep(current, delta, radius), hit = swept.hit;
            if (hit.hitEntity()) {
                var target = hit.target();
                if (target === null || scope.friendly(target)) { movementScenes.finish(current, done); return; }
                var point = hit.position();
                covetHand(current, point);
                var before = scope.observe(target), maximum = before ? Math.max(1, before.maxHealth()) : 1;
                var landed = impact(current, hit, "covet", p("covet", "charm", current), { damage: damageSpec("covet", "charm"), contact: true });
                var after = scope.valid(target) ? scope.observe(target) : null;
                var dealt = before ? before.health() - (after ? after.health() : 0) : 0;
                var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
                // 降攻按实际提交的等级数回执：目标已到下限或免疫时不再谎报「攻势 -x」。
                var dropped = landed && scope.valid(target) ? NativeEffects.boost(scope, target, "atk", -soften) : 0;
                var stolen = false, itemId = "";
                // 命中时重新验空手，并要求接收槽仍空；原子转移由原生 CAS 保障，途中获物则退回普通打击。
                if (landed && after !== null && after.health() > 0 && !NativeItems.sealed(scope, actor) && !NativeItems.sealed(scope, target)) {
                    var theirs = covetHeldOf(scope, target);
                    if (theirs !== null && NativeItems.exchangeHeld(scope, actor, target, 1, { firstEmpty: true }).ok) {
                        stolen = true; itemId = theirs.id;
                    }
                }
                if (landed && scope.valid(target)) {
                    WorldFeedback.emit(scope, covetScene, 1, point, { moment: "charm", target: String(target.ref()),
                        soft: Math.max(1, Math.abs(dropped)), scale: scale, hearts: Math.round(hearts * (0.7 + intensity * 0.2)) }, 28);
                    if (dropped !== 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), covetCharmText, [Math.abs(dropped)], 26);
                    scope.hitDisplace(target, direction.scale(push));
                }
                sound(current, "cobblemon:impact.normal");
                if (stolen) {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), covetStealText, [], 30);
                    sound(current, "minecraft:entity.allay.item_taken");
                    WorldFeedback.emit(scope, covetScene, 1, point, { moment: "steal", target: String(target.ref()),
                        item: itemId, hearts: Math.round(hearts), scale: scale }, 30);
                    covetHome(current, point, itemId);
                } else if (landed) {
                    // 取物回执与降攻回执分开：这里只说明这一贴有没有拿到东西。
                    var nowEmpty = covetHeldOf(scope, actor) === null;
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)),
                        nowEmpty ? covetStrikeText : covetFullText, [], 26);
                }
                movementScenes.finish(current, done);
                return;
            }
            var moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
            travelled += moved;
            if (hit.blocked() || moved < p("covet", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(scope, covetScene, 1, hit.position(), { moment: "flop", scale: scale }, 20);
                var self = scope.observe(actor);
                if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.1, 0)), covetMissText, [], 22);
                movementScenes.finish(current, done);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: "covet",
        cooldownParameter: "recharge",
        name: "渴望",
        description: "一边可爱地撒娇一边贴上去，命中时让对手攻势软一拍；自己空手时，还能把它的持有物卷进自己手里。亲密度越高，这份撒娇越自然。",
        uses: ["贴近并夺取对手的持有物", "用持续的撒娇削弱一个对手的攻势", "空手时的普通近身打击"],
        kind: "enemy",
        range: 3,
        maxRange: 5,
        prepare: 5,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "dash",
        defaults: { polite: false, ai: { maxChase: 12, leaveStation: false, stealOnly: false } },
        fields: [flag("polite", "有礼")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["covet"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("covet", "charge", context)), recover: Math.round(p("covet", "aftercast", context)),
                cooldown: Math.round(p("covet", "recharge", context)), active: 0, range: p("covet", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:covet:" + action.id(), covetScene, 1, action.origin(), JSON.stringify({
                moment: "whisper", scale: scale, hearts: Math.round(p("covet", "hearts", action)),
                armed: covetHeldOf(action.sense(), action.actor()) === null ? 0 : 1 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            covetGlide(action, done);
        },
        indicator: function () { return { radius: 3, geometry: "line", style: "dash", label: "渴望" }; }
    });
}
