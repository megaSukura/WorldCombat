/**
 * 渴望 / covet —— 注册与动作。
 *
 * 念头：一边可爱地撒娇一边蹭近，趁对手被分了神把它的持有物卷走；每一记落地都让对手攻势软一拍。
 * 两幕：
 *   起（windup，提交前）：心形光点在头顶飘起，指尖向内聚粉光——预告这份撒娇。
 *   贴（execute，提交后）：缓缓蹭过去，撞上活体的一刻结算接触伤害；落地即让目标攻击 −1 级（有礼时 −2），
 *       若自己空手，把它手里的道具换进自己手里——道具贴图沿一条归巢弧线飞回施法者。
 *       自己手上有物或对手空手时，只当一记会降攻的普通打击。
 * 与同为“偷取”的小偷分开：本招走一般属性、更慢更软、不退反贴，用持续的降攻换手；小偷走恶属性、更快更重、可退可压。
 * 道具交换走统一原生装备事务（`equipmentExchange`），宝可梦携带物与原版生物/玩家的主副手同一契约；
 * 被查封（embargo）者不参与转手；不复制、不凭空生成。
 */
namespace PokemonSkills {
    const covetScene = "world_combat:move_covet";
    const covetStealText = "world_combat.move.covet.text.steal";
    const covetCharmText = "world_combat.move.covet.text.charm";
    const covetStrikeText = "world_combat.move.covet.text.strike";
    const covetFullText = "world_combat.move.covet.text.full";
    const covetMissText = "world_combat.move.covet.text.miss";

    /** 得手后让道具贴图从目标手里沿一条归巢弧线飞回施法者（道具此刻已经在手里，这只是画面）。 */
    function covetArc(current: CombatAction, target: CombatActor, itemId: string): void {
        var world = current.world(), actor = current.actor();
        var theirs = world.observe(target), mine = world.observe(actor);
        if (theirs === null || mine === null) return;
        var origin = theirs.position().plus(WorldCombat.point(0, theirs.height() * 0.6, 0));
        var delta = mine.position().plus(WorldCombat.point(0, mine.height() * 0.6, 0)).minus(origin);
        var velocity = (delta.length() < 0.05 ? aim(current) : delta.unit()).scale(0.9);
        var flight = current.projectile(origin, velocity, 0, 0.18, 14, 26,
            function () { }, function () { },
            JSON.stringify({ item: itemId, scale: 1, glow: true, pierce: 1, homing: { target: String(actor.ref()), turn: 80 } }));
        WorldFeedback.emit(world, covetScene, 1, origin, { moment: "steal", projectile: flight, item: itemId, scale: 1 }, 30);
    }

    function covetGlide(action: CombatAction, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor();
        var direction = aim(action), length = p("covet", "reach", action), speed = p("covet", "step", action);
        var radius = p("covet", "radius", action), push = p("covet", "push", action);
        var soften = Math.max(1, Math.round(p("covet", "soften", action)));
        var hearts = p("covet", "hearts", action);
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var own = covetHeldOf(world, actor), emptyHanded = own === null;
        sound(action, "cobblemon:move.quickattack.actor");
        WorldFeedback.emit(world, covetScene, 1, action.origin(),
            { moment: "approach", scale: scale, hearts: Math.round(hearts), armed: emptyHanded ? 0 : 1 }, 26);
        var travelled = 0;
        function advance(current: CombatAction): void {
            var scope = current.world(), origin = current.origin();
            var delta = direction.scale(Math.min(speed, length - travelled));
            var hit = current.trace(origin, origin.plus(delta.scale(p("covet", "traceAhead", current))), radius);
            if (hit.hitEntity()) {
                var target = hit.target();
                if (target === null || scope.friendly(target)) { done(current); return; }
                var point = hit.position();
                var before = scope.observe(target), maximum = before ? Math.max(1, before.maxHealth()) : 1;
                var landed = impact(current, hit, "covet", p("covet", "charm", current), { damage: damageSpec("covet", "charm"), contact: true });
                var stolen = false, itemId = "";
                if (landed && scope.valid(target) && emptyHanded && !NativeItems.sealed(scope, actor) && !NativeItems.sealed(scope, target)) {
                    var theirs = covetHeldOf(scope, target);
                    if (theirs !== null && NativeItems.exchangeHeld(scope, actor, target).ok) {
                        stolen = true; itemId = theirs.id;
                    }
                }
                var after = scope.valid(target) ? scope.observe(target) : null;
                var dealt = before ? before.health() - (after ? after.health() : 0) : 0;
                var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
                if (landed && scope.valid(target)) {
                    NativeEffects.boost(scope, target, "atk", -soften);
                    WorldFeedback.emit(scope, covetScene, 1, point, { moment: "charm", target: String(target.ref()),
                        soft: soften, scale: scale, hearts: Math.round(hearts * (0.7 + intensity * 0.2)) }, 28);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), covetCharmText, [soften], 26);
                    scope.displace(target, direction.scale(push));
                }
                sound(current, "cobblemon:impact.normal");
                if (stolen) {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), covetStealText, [], 30);
                    sound(current, "minecraft:entity.allay.item_taken");
                    covetArc(current, target, itemId);
                } else if (landed) {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)),
                        emptyHanded ? covetStrikeText : covetFullText, [], 26);
                }
                done(current);
                return;
            }
            var moved = scope.displace(actor, delta);
            travelled += moved;
            if (hit.blocked() || moved < p("covet", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(scope, covetScene, 1, hit.position(), { moment: "flop", scale: scale }, 20);
                var self = scope.observe(actor);
                if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.1, 0)), covetMissText, [], 22);
                done(current);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        id: "covet",
        name: "渴望",
        description: "一边可爱地撒娇一边贴上去，命中时让对手攻势软一拍；自己空手时，还能把它的持有物卷进自己手里。",
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
