/**
 * 烧尽 / incinerate —— 注册与动作。
 *
 * 念头：朝瞄准方向的中央扫出一束窄火舌，从扇面左缘一路横到右缘；谁被火舌舔到，谁就在火里挨一记，
 * 手里怕火的东西（树果或宝石）当场被烧掉、谁也不得到，火顺势窜高让这一击更重。
 * 两幕：
 *   起（windup，提交前）：火苗在口前拢成一束、向内卷——预告横扫的中央方向。
 *   扫（execute，提交后）：火舌每刻转向下一格，用 action.trace 沿真实直线判定到第一个身体或方块为止；
 *       每个敌人第一次被舌尖扫过时结算一记 scorch 伤害。携带树果或宝石者，经统一装备事务被 CAS 取走烧毁
 *       （不掉落、不复制），只有这次取走真的成功，才把 flare 追加进同次伤害预算；取不走仍吃基础火击。
 *       扫完整张半角后收火；一个敌人都没扫到时火舌在前方自行散开。
 * 判定与表现同源：trace 的真实接触点既写进伤害，也作为火舌尖端与撞墙点的表现位置。
 * 与同为“夺物”的渴望／小偷分开：本招不拿也不留，而是当场烧毁，是拒止手段。
 */
namespace PokemonSkills {
    const incinerateScene = "world_combat:move_incinerate";
    const incinerateBurnText = "world_combat.move.incinerate.text.burn";
    const incinerateMissText = "world_combat.move.incinerate.text.miss";

    function incinerateVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 方块面到外向法线，撞墙的火沿它舔出去；未知接触回落到向上。 */
    function incinerateNormal(face: string): number[] {
        if (face === "down") return [0, -1, 0];
        if (face === "north") return [0, 0, -1];
        if (face === "south") return [0, 0, 1];
        if (face === "west") return [-1, 0, 0];
        if (face === "east") return [1, 0, 0];
        return [0, 1, 0];
    }

    function incinerateSweep(action: CombatAction, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), direction = aim(action);
        var flat = WorldCombat.point(direction.x(), 0, direction.z());
        var heading = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        var base = Math.atan2(heading.z(), heading.x());
        var reach = p("incinerate", "reach", action), half = p("incinerate", "fan", action) * Math.PI / 360;
        var power = p("incinerate", "scorch", action), flare = p("incinerate", "flare", action);
        var flames = Math.round(p("incinerate", "flames", action)), tongue = Math.max(0.15, p("incinerate", "tongue", action));
        var ticks = Math.max(2, Math.round(p("incinerate", "sweep", action)));
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var scenes = WorldFeedback.actionScenes(incinerateScene);
        var hitRefs: { [ref: string]: boolean } = {};
        var hits = 0;

        function finish(current: CombatAction): void {
            var scope = current.world();
            if (hits === 0) {
                var self = scope.observe(actor), at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, incinerateScene, 1, at, { moment: "fizzle", scale: scale }, 20);
                WorldFeedback.text(scope, at, incinerateMissText, [], 22);
            }
            sound(current, "cobblemon:move.flamethrower.target");
            scenes.finish(current, done);
        }

        function advance(current: CombatAction, step: number): void {
            var scope = current.world(), self = scope.observe(actor);
            var origin = self !== null ? self.position() : current.origin();
            var angle = base - half + (ticks <= 1 ? 0 : 2 * half * step / (ticks - 1));
            var dir = WorldCombat.point(Math.cos(angle), 0, Math.sin(angle));
            var hit = current.trace(origin, origin.plus(dir.scale(reach)), tongue, true);
            var at = hit.position(), span = at.minus(origin).length();
            var actual = span < 0.01 ? dir : at.minus(origin).unit();
            scenes.show(current, "sweep", origin, {
                moment: "sweep", path: [incinerateVertex(origin), incinerateVertex(at)], point: incinerateVertex(at),
                direction: [actual.x(), actual.y(), actual.z()], flames: flames, scale: scale,
                reach: span, progress: ticks <= 1 ? 1 : (step + 1) / ticks
            });
            var target = hit.hitEntity() ? hit.target() : null;
            if (target !== null && String(target.key()) !== String(actor.key()) && !scope.friendly(target)) {
                var ref = String(target.ref());
                if (!hitRefs[ref]) {
                    hitRefs[ref] = true;
                    hits++;
                    var burnable = incinerateBurnable(scope, target), burned = false;
                    if (burnable !== null && NativeItems.takeHeld(scope, target, burnable).ok) burned = true;
                    var before = scope.observe(target), maximum = before ? Math.max(1, before.maxHealth()) : 1;
                    var amount = power + (burned ? flare : 0);
                    hurt(current, target, "incinerate", amount, { damage: damageSpec("incinerate", "scorch") });
                    var after = scope.valid(target) ? scope.observe(target) : null;
                    var dealt = before ? before.health() - (after ? after.health() : 0) : 0;
                    var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
                    WorldFeedback.emit(scope, incinerateScene, 1, at,
                        { moment: "burn", target: ref, scale: scale, intensity: intensity,
                            flare: burned ? flames : 0, ash: burned ? Math.max(2, Math.round(flames * 0.35)) : 0 }, 28);
                    if (burned) {
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), incinerateBurnText,
                            [{ key: "item." + burnable!.id.replace(":", "."), fallback: burnable!.kind }], 30);
                        sound(current, "minecraft:block.fire.extinguish");
                    }
                }
            } else if (hit.blocked()) {
                var cell = hit.blockPosition(), point = cell === null ? at : cell;
                WorldFeedback.emit(scope, incinerateScene, 1, point,
                    { moment: "wall", face: hit.blockFace(), direction: incinerateNormal(hit.blockFace()),
                        scale: scale, flames: Math.max(4, Math.round(flames * 0.5)) }, 20);
            } else if (hit.hitEntity()) {
                WorldFeedback.emit(scope, incinerateScene, 1, at, { moment: "ward", scale: scale }, 18);
            }
            if (step + 1 >= ticks) { finish(current); return; }
            current.after(1, function (next: CombatAction) { advance(next, step + 1); });
        }

        sound(action, "cobblemon:move.flamethrower.actor");
        advance(action, 0);
    }

    define({
        id: "incinerate",
        cooldownParameter: "recharge",
        name: "烧尽",
        description: "朝瞄准方向的中央扫出一束窄火舌，从扇面一侧横到另一侧；每个敌人第一次被火舌扫过时吃一记火属性特攻。谁携带树果或宝石，就在被扫到时当场烧毁、谁也不得到；只有真的烧掉，火才顺势窜高让这一击更重。火舌是真实直线，被方块或身体挡住就停在接触点。",
        uses: ["一束横扫的火舌，从左到右各点一次", "烧掉对手的树果或宝石，让它再也用不了", "对持有可燃物者追加一段爆燃"],
        kind: "aim",
        range: 3.2,
        maxRange: 6,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 34,
        style: "fire",
        defaults: { wide: false, ai: { maxChase: 10, leaveStation: false, burnItems: false } },
        fields: [flag("wide", "广域")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["incinerate"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("incinerate", "charge", context)), recover: Math.round(p("incinerate", "aftercast", context)),
                cooldown: Math.round(p("incinerate", "recharge", context)), active: 0, range: p("incinerate", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:incinerate:" + action.id(), incinerateScene, 1, action.origin(), JSON.stringify({
                moment: "gather", scale: scale, flames: Math.round(p("incinerate", "flames", action)),
                fan: p("incinerate", "fan", action) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            incinerateSweep(action, done);
        },
        indicator: function () { return { radius: 5, geometry: "cone", style: "fire", color: 0xF08030, label: "烧尽" }; }
    });
}
