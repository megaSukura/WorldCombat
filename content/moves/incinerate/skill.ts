/**
 * 烧尽 / incinerate —— 注册与动作。
 *
 * 念头：朝瞄准方向的中央扫出一束窄火舌，从扇面左缘一路横到右缘；谁被火舌舔到，谁就在火里挨一记，
 * 手里怕火的东西（树果或宝石）当场被烧掉、谁也不得到，火顺势窜高让这一击更重。
 * 两幕：
 * 起（windup，提交前）：火苗在口前（跟随当刻瞄准方向）拢成一束、向内卷——预告横扫的中央方向。
 *   扫（execute，提交后）：火舌每刻转向下一格；相邻两格之间的角区间再补成若干连续窄子段，逐子段 trace
 *     到第一个身体或方块为止，窄目标不会从 8 刻的角隙里漏掉。每个敌人第一次被舌尖扫过时结算一记 scorch 伤害。
 *     携带树果或宝石者，经统一装备事务被 CAS 取走烧毁（不掉落、不复制），只有这次取走真的成功，才把 flare
 *     追加进同次伤害预算；取不走仍吃基础火击。伤害与烧物各按成功回执，被原生拒绝的那一项不发成功提示。
 *     扫完整张整角后留几刻显示末段再收火；一个敌人都没扫到时火舌在前方自行散开。
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
        var reach = p("incinerate", "reach", action), fan = p("incinerate", "fan", action);
        var half = fan * Math.PI / 360;
        var power = p("incinerate", "scorch", action), flare = p("incinerate", "flare", action);
        var flames = Math.round(p("incinerate", "flames", action)), tongue = Math.max(0.15, p("incinerate", "tongue", action));
        var ticks = Math.max(2, Math.round(p("incinerate", "sweep", action)));
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var scenes = WorldFeedback.actionScenes(incinerateScene);
        var hitRefs: { [ref: string]: boolean } = {};
        var contacts = 0, previous = base - half;

        function finish(current: CombatAction): void {
            var scope = current.world();
            if (contacts === 0) {
                var self = scope.observe(actor), at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, incinerateScene, 1, at, { moment: "fizzle", scale: scale }, 20);
                WorldFeedback.text(scope, at, incinerateMissText, [], 22);
            }
            sound(current, "cobblemon:move.flamethrower.target");
            scenes.finish(current, done);
        }

        /** 每个敌人第一次被火舌扫过时结算；伤害与烧物各按成功回执，被原生拒绝就不发对应的成功提示。 */
        function scorchTarget(current: CombatAction, scope: CombatWorld, target: CombatActor, point: CombatPoint): void {
            hitRefs[String(target.ref())] = true;
            contacts++;
            var burnable = incinerateBurnable(scope, target), burned = false;
            if (burnable !== null && NativeItems.takeHeld(scope, target, burnable).ok) burned = true;
            var before = scope.observe(target), maximum = before ? Math.max(1, before.maxHealth()) : 1;
            var landed = hurt(current, target, "incinerate", power + (burned ? flare : 0), { damage: damageSpec("incinerate", "scorch") });
            if (landed) {
                var after = scope.valid(target) ? scope.observe(target) : null;
                var dealt = before ? before.health() - (after ? after.health() : 0) : 0;
                WorldFeedback.emit(scope, incinerateScene, 1, point,
                    { moment: "burn", target: String(target.ref()), scale: scale, intensity: Math.max(1, Math.min(3, 1 + dealt / maximum * 4)),
                        flare: burned ? flames : 0, ash: burned ? Math.max(2, Math.round(flames * 0.35)) : 0 }, 28);
            }
            if (burned) {
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), incinerateBurnText,
                    [{ key: "item." + burnable!.id.replace(":", "."), fallback: burnable!.kind }], 30);
                sound(current, "minecraft:block.fire.extinguish");
            }
        }

        /** 本刻角区间内补齐连续窄段：逐子段 trace，判定与画面共用这一圈真实端点；墙与身体仍按各子段首个遮挡截断。 */
        function advance(current: CombatAction, step: number): void {
            var scope = current.world(), self = scope.observe(actor);
            var origin = self !== null ? self.position() : current.origin();
            var angle = base - half + (ticks <= 1 ? 0 : 2 * half * step / (ticks - 1));
            var from = step <= 0 ? angle : previous, span = angle - from;
            var sub = Math.max(1, Math.min(6, Math.ceil(Math.abs(span) * reach / Math.max(0.1, tongue * 1.6))));
            var path = [incinerateVertex(origin)], leading = origin, ward = false;
            var wall: { point: CombatPoint; face: string } | null = null;
            for (var i = 1; i <= sub; i++) {
                var ray = WorldCombat.point(Math.cos(from + span * i / sub), 0, Math.sin(from + span * i / sub));
                var hit = current.trace(origin, origin.plus(ray.scale(reach)), tongue, true);
                var point = hit.position(), target = hit.hitEntity() ? hit.target() : null;
                path.push(incinerateVertex(point)); leading = point;
                if (target !== null && String(target.key()) !== String(actor.key()) && !scope.friendly(target)) {
                    if (!hitRefs[String(target.ref())]) scorchTarget(current, scope, target, point);
                } else if (hit.blocked()) {
                    if (wall === null) wall = { point: point, face: hit.blockFace() };
                } else if (hit.hitEntity()) ward = true;
            }
            var actual = leading.minus(origin);
            actual = actual.length() < 0.01 ? WorldCombat.point(Math.cos(angle), 0, Math.sin(angle)) : actual.unit();
            scenes.show(current, "sweep", origin, {
                moment: "sweep", path: path, point: incinerateVertex(leading),
                direction: [actual.x(), actual.y(), actual.z()], flames: flames, scale: scale,
                reach: leading.minus(origin).length(), progress: ticks <= 1 ? 1 : (step + 1) / ticks
            });
            if (wall !== null) WorldFeedback.emit(scope, incinerateScene, 1, wall.point,
                { moment: "wall", face: wall.face, direction: incinerateNormal(wall.face), scale: scale,
                    flames: Math.max(4, Math.round(flames * 0.5)) }, 20);
            else if (ward) WorldFeedback.emit(scope, incinerateScene, 1, leading, { moment: "ward", scale: scale }, 18);
            previous = angle;
            // 末段先 show 再留几刻让人看清，最后才收火，避免末角被当刻的 settle 盖掉。
            if (step + 1 >= ticks) { current.after(4, function (next: CombatAction) { finish(next); }); return; }
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
            // 口前锚点跟着当刻瞄准方向走，不再钉在世界 +Z 轴上。
            var delta = action.targetPosition().minus(action.origin());
            var heading = WorldGeometry.flatUnit(delta, action.direction());
            var mouth = action.origin().plus(heading.scale(0.55)).plus(WorldCombat.point(0, 0.6, 0));
            action.present("world_combat:incinerate:" + action.id(), incinerateScene, 1, mouth, JSON.stringify({
                moment: "gather", point: incinerateVertex(mouth), direction: [heading.x(), heading.y(), heading.z()],
                scale: scale, flames: Math.round(p("incinerate", "flames", action)),
                fan: p("incinerate", "fan", action) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            incinerateSweep(action, done);
        },
        indicator: function (config, pokemon) {
            return { radius: p("incinerate", "reach", pokemon), geometry: "cone", orientation: "ground",
                spread: p("incinerate", "fan", pokemon), style: "fire", color: 0xF08030, label: "烧尽" };
        }
    });
}
