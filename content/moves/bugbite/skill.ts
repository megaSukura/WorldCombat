/**
 * 虫咬 / bugbite —— 注册与动作。
 *
 * 念头：一口咬住，把对手身上的树果咬下来当场吞掉，果子的效果落到自己身上。
 * 两幕半：
 *   起（windup，提交前）：颚部张开、绿色汁液光泽在口边聚起——预告这一口。
 *   咬（execute，提交后）：短距离扑咬，撞上活体结算接触咬击；若它携带树果，果子经统一装备事务被咬下。
 *   嚼（chew → gain）：含在原地咀嚼几刻，然后把果子的效果吸收进自己身上（回复 / 解异常 / 升能力等级）。
 *   对手空手，或手里的东西不是树果时，只当一记短促的接触咬击。
 * 与同为“吃果”的啄食分开：虫咬更短更重、贴近咬合、咀嚼后吸收更充分；啄食则够得远、够得高、吞得快而浅。
 * 树果经统一的原生装备事务被取走（宝可梦的携带物与原版生物/玩家的手同一读取与取走路径），不复制、不凭空生成；
 * 效果落在所有战斗者共有的回复、异常身份与能力等级载体上。
 */
namespace PokemonSkills {
    const bugbiteScene = "world_combat:move_bugbite";
    const bugbiteEatText = "world_combat.move.bugbite.text.eat";
    const bugbiteHealText = "world_combat.move.bugbite.text.heal";
    const bugbiteBoostText = "world_combat.move.bugbite.text.boost";
    const bugbiteCureText = "world_combat.move.bugbite.text.cure";
    const bugbiteSpikeText = "world_combat.move.bugbite.text.spike";
    const bugbiteNoneText = "world_combat.move.bugbite.text.none";
    const bugbitePlainText = "world_combat.move.bugbite.text.plain";
    const bugbiteMissText = "world_combat.move.bugbite.text.miss";

    /** 咽下之后把结果画出来：回复量、能力等级或异常解除各有自己的浮字与表现。 */
    function bugbiteSavor(current: CombatAction, result: any, motes: number, scale: number): void {
        var world = current.world(), actor = current.actor(), body = world.observe(actor);
        var point = body !== null ? body.position() : current.origin();
        var data = { moment: "gain", target: String(actor.ref()), heal: result.healed, stages: result.stages,
            stat: result.stat || "", cured: result.cured.length, spike: result.recoil ? 1 : 0, motes: Math.round(motes),
            gain: Math.max(2, Math.round(result.healed) + (result.stages || 0) * 2 + (result.cured.length ? 2 : 0) + (result.recoil ? 2 : 0)),
            scale: scale };
        WorldFeedback.emit(world, bugbiteScene, 1, point, data, 28);
        if (result.healed > 0) feedback(world, actor, point, "heal", { amount: result.healed });
        if (result.healed > 0) WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), bugbiteHealText, [result.healed], 30);
        else if (result.stat) WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), bugbiteBoostText,
            [{ key: "worldcombat.skill.bugbite.stat." + result.stat, fallback: result.stat }, result.stages], 30);
        else if (result.cured.length > 0) WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), bugbiteCureText, [], 30);
        else if (result.recoil) WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), bugbiteSpikeText, [], 30);
        else WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), bugbiteNoneText, [], 26);
    }

    function bugbiteGnaw(action: CombatAction, config: any, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor();
        var direction = aim(action), length = p("bugbite", "reach", action), speed = p("bugbite", "step", action);
        var radius = p("bugbite", "radius", action), push = p("bugbite", "push", action);
        var motes = p("bugbite", "motes", action), absorb = p("bugbite", "absorb", action);
        var devour = !!(config && config.devour);
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var travelled = 0;
        function advance(current: CombatAction): void {
            var scope = current.world(), origin = current.origin();
            var delta = direction.scale(Math.min(speed, length - travelled));
            var hit = current.trace(origin, origin.plus(delta.scale(p("bugbite", "traceAhead", current))), radius);
            if (hit.hitEntity()) {
                var target = hit.target();
                if (target === null || scope.friendly(target)) { done(current); return; }
                var point = hit.position(), held = NativeItems.heldBerry(scope, target), berry = held !== null ? held.berry : null;
                var landed = impact(current, hit, "bugbite", p("bugbite", "gnaw", current),
                    { damage: damageSpec("bugbite", "gnaw"), contact: true, bite: true });
                WorldFeedback.emit(scope, bugbiteScene, 1, point,
                    { moment: "bite", target: String(target.ref()), berry: berry !== null ? 1 : 0, scale: scale,
                        motes: Math.round(motes), bits: berry !== null ? Math.round(motes) : Math.round(motes * 0.4) }, 26);
                sound(current, "cobblemon:move.bite.target");
                if (landed && scope.valid(target)) scope.displace(target, direction.scale(push));
                if (landed && held !== null && scope.valid(target) && NativeItems.takeHeld(scope, target, held.held).ok) {
                    var eaten = held.berry;
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), bugbiteEatText, [{ key: eaten.name, fallback: "berry" }], 28);
                    WorldFeedback.emit(scope, bugbiteScene, 1, point,
                        { moment: "chew", target: String(actor.ref()), berry: 1, scale: scale, motes: Math.round(motes) }, 30);
                    sound(current, "cobblemon:item.berry.eat");
                    current.after(Math.max(1, Math.round(p("bugbite", "chew", current))), function (next) {
                        bugbiteSavor(next, bugbiteAbsorb(next, eaten, absorb, devour ? 1 : 0), motes, scale);
                        done(next);
                    });
                    return;
                }
                if (landed) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), bugbitePlainText, [], 26);
                done(current);
                return;
            }
            var moved = scope.displace(actor, delta);
            travelled += moved;
            if (hit.blocked() || moved < p("bugbite", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(scope, bugbiteScene, 1, hit.position(), { moment: "miss", scale: scale }, 20);
                var self = scope.observe(actor);
                if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.1, 0)), bugbiteMissText, [], 22);
                done(current);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: "bugbite",
        cooldownParameter: "recharge",
        name: "虫咬",
        description: "咬住对手进行攻击；若它携带树果，就把果子咬下来当场吃掉，果子的效果落到自己身上——回复、解除异常或提升能力等级。贴近咬合、咀嚼后吸收更充分。",
        uses: ["咬一口并吃掉对手的树果", "把对手的树果变成自己的回复或强化", "贴身的一次接触咬击"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "bite",
        defaults: { devour: false, ai: { maxChase: 10, leaveStation: false, berryOnly: false } },
        fields: [flag("devour", "狼吞")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["bugbite"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("bugbite", "charge", context)), recover: Math.round(p("bugbite", "aftercast", context)),
                cooldown: Math.round(p("bugbite", "recharge", context)), active: 0, range: p("bugbite", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var target = action.target();
            var berry = target !== null && target !== undefined ? bugbiteBerryOf(action.sense(), target) : null;
            action.present("world_combat:bugbite:" + action.id(), bugbiteScene, 1, action.origin(), JSON.stringify({
                moment: "rear", scale: scale, motes: Math.round(p("bugbite", "motes", action)), berry: berry !== null ? 1 : 0 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            bugbiteGnaw(action, config, done);
        },
        indicator: function () { return { radius: 3, geometry: "line", style: "bite", color: 0xA8B820, label: "虫咬" }; }
    });
}
