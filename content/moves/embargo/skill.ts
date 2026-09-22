/**
 * 查封 / embargo —— 注册与动作。
 *
 * 念头：一枚会跟着目标走的查封印记。命中后扣在对方的道具位上——道具的轮廓还在，力量却传不出来；
 *   这段时间它既用不了自己的道具，也收不到新的道具。
 * 三幕：
 *   起（windup，提交前）：指尖拢起一团暗色封条，锁环在掌心预转（只观察、只预告，可被打断且不花代价）。
 *   封（execute，提交后）：一条由封条顶点连成的线从施法者射向目标；命中后给目标挂上共享身份
 *     `world_combat:status/embargo` 的印记，若是宝可梦再叠加共享的 `NativeModifiers` suppressItems 层，
 *     于是所有读取持有物的结算都读到「道具被按住」。
 *   续／松（mob_effect_tick 续表现／mob_effect_removed 到期或被人清除）：印记跟着目标走，
 *     到期自己松开，被牛奶或 `/effect clear` 清除时提前解封、画面不同。
 *
 * 只封一个目标；道具仍在手里（不是拍掉、不是熔化、不是交换）。别的单元的交付招式要消费这条身份，
 * 用 `CombatStatus.has(world, actor, "embargo")` 即可；本组的传递礼物（bestow）就此拒绝向被查封者送出道具。
 */
namespace PokemonSkills {
    const embargoScene = "world_combat:move_embargo";
    const embargoEffect = "world_combat:embargo";
    const embargoStatus = "embargo";
    const embargoSealText = "world_combat.move.embargo.text.seal";
    const embargoBareText = "world_combat.move.embargo.text.seal.bare";
    const embargoOpenText = "world_combat.move.embargo.text.open";
    const embargoBreakText = "world_combat.move.embargo.text.break";
    const embargoMissText = "world_combat.move.embargo.text.miss";

    /** 目标身上的道具压制层实例 id 与画面用的锁环数；随印记一起出现、一起收回。 */
    var embargoSeals: { [ref: string]: { mod: number; shackles: number } } = Object.create(null);

    /** 目标手里的东西（宝可梦取原生持有物；其他生物没有可供查封的道具）。 */
    function embargoHeld(world: CombatWorld, actor: CombatActor): string {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return "";
        return String(CobblemonCombat.pokemon(actor).heldItem());
    }
    function embargoItemKey(id: string): string { return "item." + String(id).replace(":", "."); }

    /** 给宝可梦叠加共享的道具压制层；其他生物只带印记身份。 */
    function embargoApplySeal(world: CombatWorld, target: CombatActor, ticks: number, shackles: number): void {
        var ref = String(target.ref());
        var mod = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) mod = NativeModifiers.apply(world, target, { suppressItems: true }, ticks);
        embargoSeals[ref] = { mod: mod, shackles: shackles };
    }
    function embargoReleaseSeal(world: CombatWorld, target: CombatActor): void {
        var ref = String(target.ref()), entry = embargoSeals[ref];
        if (entry && entry.mod) world.operation(entry.mod, "world_combat:dispel", "{}");
        delete embargoSeals[ref];
    }

    // 持续：印记跟着目标走，每 25 刻续一次低密度的锁环脉动。
    WorldCombat.on("world_combat:move_embargo/hold", "world_combat:mob_effect_tick", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== embargoEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 25 !== 0) return;
        var body = world.observe(actor);
        if (body === null) return;
        var entry = embargoSeals[String(actor.ref())];
        WorldFeedback.keep(world, "world_combat:move_embargo/hold/" + String(actor.ref()), embargoScene, 1, body.position(),
            { moment: "hold", target: String(actor.ref()), shackles: entry ? entry.shackles : 10 }, 40);
    });

    // 结束：到期是印记自己松开（release），被外力清除是硬拔下来（break）；两者都收回道具压制层。
    WorldCombat.on("world_combat:move_embargo/end", "world_combat:mob_effect_removed", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== embargoEffect) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        var expired = String(data.cause) === "expired";
        embargoReleaseSeal(world, actor);
        var body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, embargoScene, 1, body.position(),
            { moment: expired ? "release" : "break", target: String(actor.ref()), expired: expired ? 1 : 0 }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)),
            expired ? embargoOpenText : embargoBreakText, [], 26);
        world.sound("minecraft:block.conduit.deactivate", body.position(), 12, "{}");
    });

    define({
        id: "embargo",
        name: "查封",
        description: "向对手送去一枚跟着它走的查封印记：在印记松开前，它用不了自己的持有物，也收不到新的道具。道具仍在手里，只是暂时被封住。",
        uses: ["封住依赖持有物的对手", "在道具交换发生前先按住对方的手", "让对手再也接不到队友递来的道具"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 11,
        active: 0,
        recover: 8,
        cooldown: 95,
        style: "seal",
        defaults: { deep: false, ai: { maxChase: 12, denyItems: true, leaveStation: false } },
        fields: [flag("deep", "深锁")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["embargo"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var deep = !!(config && config.deep);
            return { prepare: Math.round(p("embargo", "tempo", context)),
                recover: Math.round(p("embargo", "aftercast", context)),
                cooldown: Math.round(p("embargo", "recharge", context)) + (deep ? 6 : -4),
                active: 0, range: p("embargo", "reach", context) };
        },
        ready: function (action) {
            var world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            var self = world.observe(action.actor()), body = world.observe(target);
            if (self === null || body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("embargo", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, embargoStatus)) return "already-sealed";
            return "";
        },
        windup: function (action, config, prepare) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_embargo:windup", embargoScene, 1, action.origin(), JSON.stringify({
                moment: "windup", scale: scale, motes: Math.round(p("embargo", "motes", action)),
                deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world(), caster = action.actor(), target = action.target();
            var origin = action.origin(), targetPos = action.targetPosition();
            var delta = targetPos.minus(origin);
            var direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            var ticks = Math.max(60, Math.round(p("embargo", "seal", action)));
            var radius = Math.max(0.18, p("embargo", "radius", action));
            var shackles = Math.max(6, Math.round(p("embargo", "shackles", action)));
            var motes = Math.max(6, Math.round(p("embargo", "motes", action)));
            var scale = radius / 0.32;
            sound(action, "minecraft:block.conduit.deactivate");
            function fizzle(point: CombatPoint): void {
                WorldFeedback.emit(world, embargoScene, 1, point, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), embargoMissText, [], 24);
                done(action);
            }
            if (target === null || !world.valid(target) || world.friendly(target)) { fizzle(targetPos); return; }
            var body = world.observe(target);
            if (body === null || !world.clear(origin, body.position())) { fizzle(targetPos); return; }
            var at = body.position();
            var held = embargoHeld(world, target);
            var path: (string | number[])[] = [String(caster.ref()), String(target.ref())];
            WorldFeedback.emit(world, embargoScene, 1, origin,
                { moment: "cast", target: String(target.ref()), path: path, motes: motes, scale: 1,
                    direction: [direction.x(), direction.y(), direction.z()],
                    reach: Math.max(0.5, Math.min(action.range(), delta.length() || action.range())) }, 18);
            if (!CombatStatus.apply(world, target, embargoStatus, embargoEffect, ticks, 0, { unique: true })) { fizzle(at); return; }
            embargoApplySeal(world, target, ticks, shackles);
            WorldFeedback.emit(world, embargoScene, 1, at,
                { moment: "seal", target: String(target.ref()), shackles: shackles, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, ticks / 260)) }, 32);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), held ? embargoSealText : embargoBareText,
                held ? [{ key: embargoItemKey(held), fallback: held }] : [], 34);
            world.sound("minecraft:block.beacon.deactivate", at, 14, "{}");
            done(action);
        },
        indicator: function (config, pokemon) {
            var context: NumberContext = { pokemon: pokemon!, skill: skills["embargo"], detail: { values: config } };
            return { radius: pokemon ? p("embargo", "reach", context) : 9, geometry: "line", style: "seal", color: 0x8C6BD8,
                label: config && config.deep === true ? "查封·深锁" : "查封·快锁" };
        }
    });
}
