/**
 * 戏法 / trick —— 注册与动作。
 *
 * 念头的形状：三幕。
 *   起（windup，提交前）：故布疑阵——先向目标抛出一撮假印记，把它的注意力牵到不存在的「那一手」上。
 *   连（execute，提交后）：心线在两颗战斗者之间拉直，两端各亮一圈；交换沿这条线发生，双方都不动。
 *   换（结算）：两件持有物各沿心线飞向对方，手里各落一圈落定光。
 * 与同为「交换持有物」的掉包分开：戏法是超能、远程、从容，自己不动，用射程与视线换一手；
 * 掉包是恶属性、贴身掠过、一闪即换，用位移冒险换速度（见 switcheroo）。
 * 交换走统一的原子原生装备事务（equipmentExchange），宝可梦携带物与原版生物/玩家的主副手同一契约；
 * 不复制、不凭空生成；两边都空、目标黏着或被查封（embargo）时不发生，只留下一次落空。
 */
namespace PokemonSkills {
    const trickScene = "world_combat:move_trick";
    const trickSwapText = "world_combat.move.trick.text.swap";
    const trickEmptyText = "world_combat.move.trick.text.empty";
    const trickGuardText = "world_combat.move.trick.text.guard";
    const trickMissText = "world_combat.move.trick.text.miss";

    /** 一件持有物沿心线飞向对方（此刻已换手，这只是画面）。 */
    function trickArc(current: CombatAction, from: CombatActor, to: CombatActor, itemId: string, motes: number): string {
        var world = current.world(), theirs = world.observe(from), mine = world.observe(to);
        if (theirs === null || mine === null) return "";
        var origin = theirs.position().plus(WorldCombat.point(0, theirs.height() * 0.6, 0));
        var delta = mine.position().plus(WorldCombat.point(0, mine.height() * 0.6, 0)).minus(origin);
        var velocity = (delta.length() < 0.05 ? aim(current) : delta.unit()).scale(0.9);
        var flight = current.projectile(origin, velocity, 0, 0.18, 14, 30, function () { }, function () { },
            JSON.stringify({ item: itemId, scale: 1, glow: true, pierce: 1, homing: { target: String(to.ref()), turn: 90 } }));
        WorldFeedback.emit(world, trickScene, 1, origin, { moment: "trade", projectile: flight, item: itemId,
            target: String(to.ref()), motes: Math.round(motes) }, 34);
        return flight;
    }

    define({
        id: "trick",
        name: "戏法",
        description: "用超能心线隔空对调彼此手里的持有物：自己不必靠近，只要看清目标、拉直这条线。",
        uses: ["远距离把对手的好东西换过来", "把自己带着的累赘塞给对手", "空手时从远处的对手身上换一件持有物"],
        kind: "enemy",
        range: 6.5,
        maxRange: 9,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 40,
        style: "trick",
        stationary: true,
        defaults: { snap: false, ai: { maxChase: 10, leaveStation: false, tradeOnly: false } },
        fields: [flag("snap", "瞬时抓取")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["trick"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("trick", "feint", context)), recover: Math.round(p("trick", "recover", context)),
                cooldown: Math.round(p("trick", "cooldown", context)), active: 0, range: p("trick", "reach", context) };
        },
        ready: function (action: CombatAction, config: any): string {
            var world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || target === undefined || !world.valid(target) || world.friendly(target)) return "invalid-target";
            var body = world.observe(target);
            if (body === null) return "invalid-target";
            var self = world.observe(actor);
            if (self === null) return "invalid-target";
            if (self.position().minus(body.position()).length() > p("trick", "reach", action)) return "out-of-range";
            if (!world.clear(self.position(), body.position())) return "target-not-visible";
            if (trickHeldOf(world, actor) === null && trickHeldOf(world, target) === null) return "no-item";
            if (trickBlocked(world, target)) return "held-guard";
            return "";
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var target = action.target();
            action.present("world_combat:trick:" + action.id(), trickScene, 1, action.targetPosition(), JSON.stringify({
                moment: "feint", target: target === null ? "" : String(target.ref()), scale: scale,
                decoys: Math.round(p("trick", "decoys", action)), motes: Math.round(p("trick", "motes", action)) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            var world = action.world(), actor = action.actor(), target = action.target();
            var self = world.observe(actor);
            if (self === null) { done(action); return; }
            var motes = Math.round(p("trick", "motes", action));
            if (target === null || target === undefined || !world.valid(target)) {
                WorldFeedback.emit(world, trickScene, 1, self.position(), { moment: "fizzle", scale: 1 }, 22);
                WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.2, 0)), trickMissText, [], 24);
                done(action);
                return;
            }
            var mine = trickHeldOf(world, actor), theirs = trickHeldOf(world, target);
            var foe = world.observe(target);
            if (foe === null) { done(action); return; }
            var span = self.position().minus(foe.position()).length();
            var scale = (self.width() + self.height()) / 2.3;
            sound(action, "minecraft:entity.illusioner.cast_spell");
            WorldFeedback.emit(world, trickScene, 1, self.position(), { moment: "link", target: String(target.ref()),
                path: ["source", "target"], span: span, motes: motes, scale: scale }, 28);
            if (trickExchange(world, actor, target)) {
                if (mine !== null) trickArc(action, actor, target, mine.id, motes);
                if (theirs !== null) trickArc(action, target, actor, theirs.id, motes);
                WorldFeedback.emit(world, trickScene, 1, foe.position(), { moment: "settle", target: String(target.ref()),
                    scale: scale, motes: Math.round(motes * 0.7) }, 26);
                WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)), trickSwapText, [], 28);
                sound(action, "minecraft:entity.allay.item_taken");
            } else {
                WorldFeedback.emit(world, trickScene, 1, foe.position(), { moment: "fizzle", target: String(target.ref()), scale: scale }, 22);
                WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)),
                    trickBlocked(world, target) ? trickGuardText : trickEmptyText, [], 26);
                sound(action, "minecraft:entity.villager.no");
            }
            done(action);
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: pokemon ? p("trick", "reach", pokemon) : 6.5, geometry: "line", style: "trick", color: 0xC77DFF, label: "戏法心线" };
        }
    });
}
