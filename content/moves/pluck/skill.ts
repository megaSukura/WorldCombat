/**
 * 啄食 / pluck —— 注册与动作。
 *
 * 念头：伸长喙沿真实瞄准一记快速啄击，够得远也够得高；若对手携带树果，当场啄下吞掉、立刻获得效果。
 * 两幕：
 *   起（windup，提交前）：抬头、张开喙，风纹沿喙尖聚起——预告这一啄的方向与高度。
 *   啄（execute，提交后）：沿真实三维瞄准伸出喙尖，用 action.trace 只取第一个碰到的身体或方块；
 *       朝上瞄准时能在 reach 之外再向上够 lift 格，因此能啄到浮空的对手，横瞄则不会命中离线高处，隔墙也没有啄击。
 *       首个身体是携带树果的非友方时，果子经统一的原生装备事务被啄下并当场吞掉，效果立刻落到自己身上
 *       （回复 / 解异常 / 升能力等级）；被墙或友方挡下就停在接触点。
 *   收：喙尖缩回口部（actionScenes 转段），空啄只掀起一缕风屑。
 * 与同为“吃果”的虫咬分开：啄食不贴近、不咀嚼，靠长喙与仰角取胜，吞得快而浅（吸收系数低于 1）。
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

    function pluckVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

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
        var world = action.world(), actor = action.actor(), direction = aim(action);
        var reach = p("pluck", "reach", action), lift = p("pluck", "lift", action), radius = Math.max(0.1, p("pluck", "radius", action));
        var power = p("pluck", "peck", action), push = p("pluck", "push", action);
        var absorb = p("pluck", "absorb", action), motes = Math.round(p("pluck", "motes", action));
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var origin = body !== null ? body.position() : action.origin();
        // 朝上瞄准时，喙在 reach 之外再向上多够 lift × 仰角；横瞄时 y≈0，喙仍是 reach 长。
        var span = reach + lift * Math.max(0, Math.min(1, direction.y()));
        var hit = action.trace(origin, origin.plus(direction.scale(span)), radius, true);
        var contact = hit.position(), delta = contact.minus(origin), length = delta.length();
        var actual = length < 0.01 ? direction : delta.unit();
        var scenes = WorldFeedback.actionScenes(pluckScene);

        sound(action, "cobblemon:move.gust.actor");
        scenes.show(action, "beak", origin, { moment: "peck", path: [pluckVertex(origin), pluckVertex(contact)],
            direction: [actual.x(), actual.y(), actual.z()], scale: scale, lift: lift, span: length, motes: motes });

        function retract(current: CombatAction): void {
            var self = current.world().observe(actor);
            var at = self !== null ? self.position() : current.origin();
            var near = at.plus(actual.scale(Math.min(0.35, length * 0.25)));
            scenes.show(current, "beak", at, { moment: "peck", path: [pluckVertex(at), pluckVertex(near)],
                direction: [actual.x(), actual.y(), actual.z()], scale: scale, lift: lift, span: 0.35, motes: motes });
            scenes.finish(current, done);
        }

        var target = hit.hitEntity() ? hit.target() : null;
        if (target !== null && String(target.key()) !== String(actor.key()) && !world.friendly(target)) {
            var held = NativeItems.heldBerry(world, target), berry = held !== null ? held.berry : null;
            var landed = hurt(action, target, "pluck", power, { damage: damageSpec("pluck", "peck"), contact: true });
            WorldFeedback.emit(world, pluckScene, 1, contact,
                { moment: "hit", target: String(target.ref()), berry: berry !== null ? 1 : 0, scale: scale,
                    motes: motes, bits: berry !== null ? motes : 0,
                    back: [-actual.x(), -actual.y(), -actual.z()] }, 24);
            sound(action, "cobblemon:impact.flying");
            if (landed && world.valid(target)) world.hitDisplace(target, actual.scale(push));
            if (landed && held !== null && world.valid(target) && NativeItems.takeHeld(world, target, held.held).ok) {
                WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 0.9, 0)), pluckEatText, [{ key: berry!.name, fallback: "berry" }], 28);
                sound(action, "cobblemon:item.berry.eat");
                pluckSavor(action, pluckAbsorb(action, held.berry, absorb), motes, scale);
            } else if (landed) {
                WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 0.9, 0)), pluckPlainText, [], 26);
            }
            action.after(2, function (next: CombatAction) { retract(next); });
            return;
        }
        if (target !== null || hit.hitEntity()) {
            WorldFeedback.emit(world, pluckScene, 1, contact,
                { moment: "ward", target: target !== null ? String(target.ref()) : "", scale: scale }, 18);
            action.after(2, function (next: CombatAction) { retract(next); });
            return;
        }
        if (hit.blocked()) {
            var cell = hit.blockPosition(), point = cell === null ? contact : cell;
            WorldFeedback.emit(world, pluckScene, 1, point,
                { moment: "wall", face: hit.blockFace(), scale: scale, motes: Math.round(motes * 0.5) }, 20);
            action.after(2, function (next: CombatAction) { retract(next); });
            return;
        }
        WorldFeedback.emit(world, pluckScene, 1, contact, { moment: "miss", scale: scale }, 20);
        WorldFeedback.text(world, contact, pluckMissText, [], 22);
        action.after(2, function (next: CombatAction) { retract(next); });
    }

    define({
        id: "pluck",
        cooldownParameter: "recharge",
        name: "啄食",
        description: "沿真实瞄准伸喙啄击，够得远也够得高（仰起能啄到浮在空中的目标）；只取第一个碰到的身体，墙和友方会先挡住。若它携带树果，就把果子啄下来当场吃掉，果子的效果立刻落到自己身上。不贴近、不咀嚼，吞得快而浅。",
        uses: ["远处啄一口并吃掉对手的树果", "仰起长喙啄到浮在空中的对手", "把对手的树果立刻变成自己的回复或强化"],
        kind: "aim",
        range: 3.6,
        maxRange: 6.5,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "peck",
        defaults: { outreach: false, ai: { maxChase: 14, leaveStation: false, berryOnly: false } },
        fields: [flag("outreach", "伸喙")],
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
