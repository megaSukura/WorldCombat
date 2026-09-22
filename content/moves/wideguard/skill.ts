/**
 * 广域防守 / wideguard — 执行组织与结算。
 *
 * 核心念头：施法者把身体一沉，向身周推出一面横贯的宽光墙；墙横着摊开，替身边的每个伙伴把从远处拍过来的
 *   成片攻击整片卸掉。它不加防、不加血，只在极短的一瞬里当一层会磨穿的墙——挡几下就散。
 *
 * 两幕：
 *   沉（windup 播「按地聚板」，提交前只观察与预告，打断不花代价）。
 *   张（提交后）：施法者与半径内的友方各挂共享身份 world_combat:status/wideguard 的真实 MobEffect，
 *     并各自领到一层共享 GuardEffects 的 pool（规则 world_combat:move_wideguard）：只截非接触（远程／范围）
 *     的敌对伤害，按总量磨穿。贴着身子的近战穿得过——这就是它与反射壁、守住的区分。
 * 持续：每约 8 刻由池的 pulse 续一次墙面；目标还带着身份才继续立着。
 * 结束：任一人的池磨穿或到时，身份与池一起收；离开施法者太远的人随共享连接断开而失去。
 */
namespace PokemonSkills {
    const wideguardScene = "world_combat:move_wideguard";
    const wideguardEffect = "world_combat:wide_guard";
    const wideguardRule = "world_combat:move_wideguard";
    const wideguardRaiseText = "world_combat.move.wideguard.text.raise";
    const wideguardBlockText = "world_combat.move.wideguard.text.block";
    const wideguardFallText = "world_combat.move.wideguard.text.fall";
    /** 表现里的参考半径：`data.scale = 实际遮蔽半径 / 这个数`。 */
    const wideguardReferenceRadius = 3.6;

    // 宽墙的结算点：只截敌对来源的非接触（远程／范围）伤害，按 pool 磨穿；磨穿即收掉该人身上的身份。
    GuardEffects.register(wideguardRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref())) return false;
            if (world.friendly(incoming.source)) return false;
            // 贴身近战带 contact 旗标，穿得过这面墙；远程与范围不带，正是要挡的那类。
            if (incoming.data && !incoming.data.area && (incoming.data.kind === "move" ? incoming.data.contact : incoming.data.direct)) return false;
            return true;
        },
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), target = effect.target();
            // 身份被人清掉时，池也一并收；这就是「解除」的路。
            if (MobEffects.read(world, target, wideguardEffect) === null) { effect.end(); return; }
            const body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            WorldFeedback.keep(world, "wideguard:hold:" + String(target.ref()), wideguardScene, 1, body.position(),
                { moment: "hold", target: String(target.ref()), plates: custom.plates, remaining: state.capacity,
                    scale: custom.scale, intensity: wideguardIntensity(state.capacity, custom.initial) }, 20);
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const data: any = { moment: "block", target: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                remaining: Math.round(state.capacity * 10) / 10, plates: custom.plates, scale: custom.scale,
                intensity: Math.max(0.6, Math.min(2, amount / Math.max(1, body.maxHealth() * 0.1))) };
            const attacker = incoming.source ? world.observe(incoming.source) : null;
            if (attacker !== null) {
                const away = body.position().minus(attacker.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, wideguardScene, 1, body.position(), data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), wideguardBlockText,
                [data.blocked, data.remaining], 24);
            world.sound("minecraft:item.shield.block", body.position(), 12, "{}");
            if (state.capacity <= 0) MobEffects.consume(world, target, wideguardEffect);
        }
    });

    /** 池的余量换算成画面强度：满墙 1、见底趋近 0.15。 */
    function wideguardIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function wideguardScale(radius: number): number {
        return Math.max(0.5, Math.min(2.2, (radius || wideguardReferenceRadius) / wideguardReferenceRadius));
    }

    /** 给施法者与半径内友方各挂一份宽墙（身份 + 按量吸收池）；返回这次墙罩住的人数。 */
    function wideguardCover(world: CombatWorld, caster: CombatActor, radius: number, ticks: number,
        capacity: number, plates: number, motes: number, linkRange: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        const scale = wideguardScale(radius);
        function protect(actor: CombatActor): boolean {
            if (MobEffects.apply(world, actor, wideguardEffect, ticks, 0) === null) return false;
            GuardEffects.apply(world, actor, { rule: wideguardRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: linkRange, initial: capacity, plates: plates, motes: motes, scale: scale } as any, ticks);
            return true;
        }
        let reached = protect(caster) ? 1 : 0;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other) || world.observe(other) === null) continue;
            if (protect(other)) reached++;
        }
        return reached;
    }

    define({
        id: "wideguard",
        name: "广域防守",
        description: "向身周推出一面横贯的宽光墙，替自己与身边的队友把远程、范围的成片攻击整片卸掉；只立极短的一瞬，挡几下就散，贴身近战穿得过。",
        uses: ["挡住对面拍过来的远程齐射", "在队友被范围招式罩住前抢一拍立墙", "用一次短窗口替全队吃下一轮爆发"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 6,
        active: 1,
        recover: 5,
        cooldown: 135,
        style: "screen",
        stationary: true,
        defaults: { brace: 1, ai: { maxChase: 10, panic: 0.6 } },
        fields: [
            field(pathOf("brace"), "墙型", "choice", {
                options: [
                    { value: 1, label: "广墙" },
                    { value: 0, label: "厚墙" }
                ],
                help: "广墙：遮蔽半径 ×1.25，但吸收总量 ×0.8，罩得广、磨得快；厚墙：吸收总量 ×1.25，但半径 ×0.85，罩得紧、更耐打。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("wideguard", "radius", pokemon) : 3.6, geometry: "area", style: "screen", color: 0xC9C3AE,
                label: config && Number(config.brace) === 1 ? "广域防守 · 广墙" : "广域防守 · 厚墙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["wideguard"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(2, Math.round(p("wideguard", "tempo", context))),
                recover: Math.round(p("wideguard", "aftercast", context)),
                cooldown: Math.round(p("wideguard", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_wideguard:brace", wideguardScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", brace: config && Number(config.brace) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const capacity = Math.max(24, Math.round(p("wideguard", "capacity", action)));
            const window = Math.max(50, Math.round(p("wideguard", "window", action)));
            const radius = Math.max(1.6, p("wideguard", "radius", action));
            const plates = Math.max(6, Math.round(p("wideguard", "plates", action)));
            const motes = Math.max(10, Math.round(p("wideguard", "motes", action)));
            const linkRange = Math.min(32, radius * 1.6 + 1);
            const reached = wideguardCover(world, actor, radius, window, capacity, plates, motes, linkRange);
            const scale = wideguardScale(radius);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, wideguardScene, 1, feet,
                { moment: "raise", target: String(actor.ref()), plates: plates, motes: motes, radius: radius, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, plates / 14 + 0.4)) }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), wideguardRaiseText,
                [Math.round(capacity), reached, Math.round(window / 20)], 34);
            world.sound("minecraft:block.glass.place", body.position(), 16, "{}");
            world.sound("minecraft:item.shield.block", body.position(), 14, "{}");
            done(action);
        }
    });

    // 墙散：身份到期或被清除时，播一次收束留痕（读操作，任何作用域都能发）。
    WorldCombat.on("world_combat:move_wideguard/fall", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== wideguardEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, wideguardScene, 1, body.position(), { moment: "fall", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), wideguardFallText, [], 22);
    });
}
