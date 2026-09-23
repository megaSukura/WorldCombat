/**
 * 啄食 / pluck —— 注册与动作。
 *
 * 念头：伸长喙一记快速啄击，够得远也够得高；若对手携带树果，当场啄下吞掉、立刻获得效果。
 * 两幕：
 *   起（windup，提交前）：抬头、张开喙，风纹沿喙尖聚起——预告这一啄的方向与高度。
 *   啄（execute，提交后）：沿瞄准方向伸出一条长喙走廊（判定带抬升），啄中走廊内最近的一个非友方；
 *       若它携带树果，果子经统一的原生装备事务被啄下并当场吞掉，效果立刻落到自己身上（回复 / 解异常 / 升能力等级）。
 *       走廊内无人时，喙尖停在前方、只掀起一缕风屑。
 * 与同为“吃果”的虫咬分开：啄食不贴近、不咀嚼，靠长喙与抬升高度取胜，吞得快而浅（吸收系数低于 1）。
 * 树果经统一装备契约被取走（宝可梦携带物与原版生物/玩家的手同一路径），不复制、不凭空生成；
 * 效果落在所有战斗者共有的回复、异常身份与能力等级载体上。
 */
namespace PokemonSkills {
    const pluckScene = "world_combat:move_pluck";
    const pluckEatText = "world_combat.move.pluck.text.eat";
    const pluckHealText = "world_combat.move.pluck.text.heal";
    const pluckBoostText = "world_combat.move.pluck.text.boost";
    const pluckCureText = "world_combat.move.pluck.text.cure";
    const pluckSpikeText = "world_combat.move.pluck.text.spike";
    const pluckNoneText = "world_combat.move.pluck.text.none";
    const pluckPlainText = "world_combat.move.pluck.text.plain";
    const pluckMissText = "world_combat.move.pluck.text.miss";

    function pluckSavor(current: CombatAction, result: any, motes: number, scale: number): void {
        var world = current.world(), actor = current.actor(), body = world.observe(actor);
        var point = body !== null ? body.position() : current.origin();
        WorldFeedback.emit(world, pluckScene, 1, point, { moment: "gain", target: String(actor.ref()),
            heal: result.healed, stages: result.stages, stat: result.stat || "", cured: result.cured.length,
            spike: result.recoil ? 1 : 0, motes: Math.round(motes),
            gain: Math.max(2, Math.round(result.healed) + (result.stages || 0) * 2 + (result.cured.length ? 2 : 0) + (result.recoil ? 2 : 0)),
            scale: scale }, 28);
        if (result.healed > 0) feedback(world, actor, point, "heal", { amount: result.healed });
        if (result.healed > 0) WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), pluckHealText, [result.healed], 30);
        else if (result.stat) WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), pluckBoostText,
            [{ key: "worldcombat.skill.pluck.stat." + result.stat, fallback: result.stat }, result.stages], 30);
        else if (result.cured.length > 0) WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), pluckCureText, [], 30);
        else if (result.recoil) WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), pluckSpikeText, [], 30);
        else WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), pluckNoneText, [], 26);
    }

    function pluckPeck(action: CombatAction, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), direction = aim(action), origin = action.origin();
        var reach = p("pluck", "reach", action), radius = p("pluck", "radius", action), lift = p("pluck", "lift", action);
        var power = p("pluck", "peck", action), push = p("pluck", "push", action);
        var absorb = p("pluck", "absorb", action), motes = p("pluck", "motes", action);
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var end = origin.plus(direction.scale(reach));
        var path = [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]];
        var lane = WorldGeometry.lane(origin, direction, reach, radius, { below: 1.0, above: lift });
        sound(action, "cobblemon:move.gust.actor");
        WorldFeedback.emit(world, pluckScene, 1, origin,
            { moment: "peck", path: path, direction: [direction.x(), direction.y(), direction.z()],
                scale: scale, lift: lift, motes: Math.round(motes) }, 24);
        var nearest: CombatActor[] = [], best = Infinity, strike = end;
        WorldGeometry.selectEnemies(world, lane, function (victim, facts) {
            var distance = facts.position().minus(origin).length();
            if (distance < best) { best = distance; nearest = [victim]; strike = facts.position(); }
        });
        if (nearest.length === 0) {
            WorldFeedback.emit(world, pluckScene, 1, end, { moment: "miss", scale: scale }, 20);
            WorldFeedback.text(world, end, pluckMissText, [], 22);
            done(action);
            return;
        }
        var victim = nearest[0], held = NativeItems.heldBerry(world, victim), berry = held !== null ? held.berry : null;
        var landed = hurt(action, victim, "pluck", power, { damage: damageSpec("pluck", "peck"), contact: true });
        WorldFeedback.emit(world, pluckScene, 1, strike,
            { moment: "hit", target: String(victim.ref()), berry: berry !== null ? 1 : 0, scale: scale,
                motes: Math.round(motes), bits: berry !== null ? Math.round(motes) : 0 }, 24);
        sound(action, "cobblemon:impact.flying");
        if (landed && world.valid(victim)) world.displace(victim, direction.scale(push));
        if (landed && held !== null && world.valid(victim) && NativeItems.takeHeld(world, victim, held.held).ok) {
            WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 0.9, 0)), pluckEatText, [{ key: berry!.name, fallback: "berry" }], 28);
            sound(action, "cobblemon:item.berry.eat");
            pluckSavor(action, pluckAbsorb(action, held.berry, absorb), motes, scale);
        } else if (landed) {
            WorldFeedback.text(world, strike.plus(WorldCombat.point(0, 0.9, 0)), pluckPlainText, [], 26);
        }
        done(action);
    }

    define({
        id: "pluck",
        cooldownParameter: "recharge",
        name: "啄食",
        description: "用喙啄击对手，够得远也够得高（能啄到浮在空中的目标）；若它携带树果，就把果子啄下来当场吃掉，果子的效果立刻落到自己身上。不贴近、不咀嚼，吞得快而浅。",
        uses: ["远处啄一口并吃掉对手的树果", "啄到浮在空中的对手", "把对手的树果立刻变成自己的回复或强化"],
        kind: "enemy",
        range: 3.6,
        maxRange: 6.5,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "peck",
        defaults: { swoop: false, ai: { maxChase: 14, leaveStation: false, berryOnly: false } },
        fields: [flag("swoop", "俯冲")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["pluck"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("pluck", "charge", context)), recover: Math.round(p("pluck", "aftercast", context)),
                cooldown: Math.round(p("pluck", "recharge", context)), active: 0, range: p("pluck", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var target = action.target();
            var berry = target !== null && target !== undefined ? pluckBerryOf(action.sense(), target) : null;
            action.present("world_combat:pluck:" + action.id(), pluckScene, 1, action.origin(), JSON.stringify({
                moment: "raise", scale: scale, berries: berry !== null ? 1 : 0, motes: Math.round(p("pluck", "motes", action)) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            pluckPeck(action, done);
        },
        indicator: function () { return { radius: 5, geometry: "line", style: "peck", color: 0xA890F0, label: "啄食" }; }
    });
}
