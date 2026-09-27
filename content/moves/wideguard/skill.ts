/**
 * 广域防守 / wideguard — 执行组织与结算。
 *
 * 核心念头：施法者把身体一沉，替自己与身边的每个伙伴各推起一层横在身前、会磨穿的随身护板；成片拍过来的
 *   远程／范围攻击先撞在这层板上被卸掉。它不加防、不加血，只在极短的一瞬里挡住几拍——挡完就散。
 *
 * 两幕：
 *   沉（windup 播「按地聚板」，提交前只观察与预告，打断不花代价）。
 *   张（提交后）：施法者与视线可达、半径内的友方各挂共享身份 world_combat:status/wideguard 的真实 MobEffect，
 *     并各自领到一层共享 GuardEffects 的 pool（规则 world_combat:move_wideguard）：只截真正交付到目标身上的直接攻击
 *     （DamageSemantics.directOffense）里属于真实 area 标注或非接触（远程）的那一类，按总量磨穿。
 *     贴着身子的普通近战带 contact 旗标穿得过——这就是它与反射壁、守住的区分。
 * 持续：池本身精确绑定这个人身上那次载体 revision（state.carrier）；身份被人清、被重放顶掉或换了实例，
 *   移除事件当刻撤掉这层池，pulse 只负责巡检续画。每个队友各自一份有限容量、限时。
 * 结束：任一人的池磨穿或到时，身份与池一起收；离开施法者太远、与施法者之间失去视线的人随共享连接断开而失去。
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

    // 宽墙的结算点：只截敌对来源、真正在场的 directOffense 伤害，且属于真实 area 或非接触（远程）的那一类，
    // 按 pool 磨穿；磨穿即收掉该人身上的身份。贴身的普通近战穿得过——这就是它与反射壁、守住的区分。
    GuardEffects.register(wideguardRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref())) return false;
            if (world.friendly(incoming.source)) return false;
            // 只挡真正交付到目标身上的直接攻击；残留／间接伤害不靠整类推断当作「成片攻击」。
            if (!DamageSemantics.directOffense(incoming.data)) return false;
            const area = !!(incoming.data && incoming.data.area === true);
            // 真实标注的 area 交付可以带接触；其余情况只有非接触（远程）才被卸掉，贴身近战带 contact 旗标穿得过。
            return area || !DamageSemantics.read(incoming.data).contact;
        },
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), target = effect.target();
            const carrier = (state as any).carrier;
            // 精确绑定本次载体 revision：身份被清、被重放顶掉或换了实例，都当刻收池，不再等 8 刻巡检。
            if (!carrier || !MobEffects.matches(world, target, carrier)) { effect.end(); return; }
            const body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const strength = wideguardIntensity(state.capacity, custom.initial);
            // 持续护板挂在这层真实按量吸收池上：池磨穿、身份被清或连接断开时随它一起收；余量越少护板越小。
            WorldFeedback.onEffect(world, effect.id(), "wideguard:hold:" + String(target.ref()), wideguardScene, 1, body.position(),
                { moment: "hold", target: String(target.ref()), plates: custom.plates, motes: custom.motes,
                    remaining: state.capacity, initial: custom.initial, plateSize: Math.max(0.08, 0.34 * strength), intensity: strength });
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const data: any = { moment: "block", target: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                remaining: Math.round(state.capacity * 10) / 10, plates: custom.plates, motes: custom.motes,
                scale: custom.scale, plateSize: Math.max(0.08, 0.34 * wideguardIntensity(state.capacity, custom.initial)),
                intensity: Math.max(0.6, Math.min(2, amount / Math.max(1, body.maxHealth() * 0.1))) };
            const attacker = incoming.source ? world.observe(incoming.source) : null;
            if (attacker !== null) {
                const away = body.position().minus(attacker.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            // 裂光落在被挡者真正挨打的那一点；结算回执带坐标时用它，否则退回身体中心。
            const hit = incoming.data && typeof incoming.data.x === "number" && typeof incoming.data.y === "number" && typeof incoming.data.z === "number"
                ? WorldCombat.point(incoming.data.x, incoming.data.y, incoming.data.z) : body.position();
            WorldFeedback.emit(world, wideguardScene, 1, hit, data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), wideguardBlockText,
                [data.blocked, data.remaining], 24);
            world.sound("minecraft:item.shield.block", body.position(), 12, "{}");
            if (state.capacity <= 0) MobEffects.consume(world, target, wideguardEffect);
        }
    });

    /** 收掉一个人身上的本招宽墙池：身份被清或重放前调用；只收归属这招的池。 */
    function wideguardDrop(world: CombatWorld, actor: CombatActor): number {
        let dropped = 0;
        world.effects(actor, "world_combat:guard").forEach(function (view: CombatEffectView) {
            let state: any;
            try { state = JSON.parse(String(view.data())); } catch (error) { return; }
            if (!state || state.rule !== wideguardRule) return;
            if (world.operation(view.id(), "world_combat:dispel", "{}")) dropped++;
        });
        return dropped;
    }

    /** 池的余量换算成画面强度：满墙 1、见底趋近 0.15。 */
    function wideguardIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function wideguardScale(radius: number): number {
        return Math.max(0.5, Math.min(2.2, (radius || wideguardReferenceRadius) / wideguardReferenceRadius));
    }

    /** 给施法者与半径内友方各挂一份宽墙（身份 + 按量吸收池）；返回这次真正罩住的施法者与伙伴。 */
    function wideguardCover(world: CombatWorld, caster: CombatActor, radius: number, ticks: number,
        capacity: number, plates: number, motes: number, linkRange: number): CombatActor[] {
        const body = world.observe(caster);
        if (body === null) return [];
        const scale = wideguardScale(radius);
        const covered: CombatActor[] = [];
        function protect(actor: CombatActor): void {
            // 重放前先撤掉这个人身上的旧池，避免刷新时新旧两层混在一起。
            wideguardDrop(world, actor);
            const carrier = MobEffects.apply(world, actor, wideguardEffect, ticks, 0);
            if (carrier === null) return;
            GuardEffects.apply(world, actor, { rule: wideguardRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: linkRange, initial: capacity, plates: plates, motes: motes, scale: scale,
                carrier: MobEffects.anchor(carrier) } as any, ticks);
            covered.push(actor);
        }
        protect(caster);
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            const seen = world.observe(other);
            if (!world.friendly(other) || seen === null) continue;
            // 初始只授予实际连通的队友：和施法者之间要有一条清视线。
            if (!world.clear(body.position(), seen.position())) continue;
            protect(other);
        }
        return covered;
    }

    define({
        id: "wideguard",
        cooldownParameter: "wait",
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
            const covered = wideguardCover(world, actor, radius, window, capacity, plates, motes, linkRange);
            const scale = wideguardScale(radius);
            // 起墙只连到实际受益者：每人身上亮一次护板；不是施法者本人的，再牵一条施法者→本人的短连线。
            // 不画地面大环／实体墙——这招真正成立的是每人一层会磨穿的随身护板。
            for (let i = 0; i < covered.length; i++) {
                const person = covered[i], at = world.observe(person);
                if (at === null) continue;
                WorldFeedback.emit(world, wideguardScene, 1, at.position(),
                    { moment: "raise", target: String(person.ref()), plates: plates, motes: motes, scale: scale,
                        intensity: Math.max(0.7, Math.min(2, plates / 16 + 0.4)) }, 34, "wideguard:raise:" + String(person.ref()));
                if (String(person.key()) === String(actor.key())) continue;
                WorldFeedback.emit(world, wideguardScene, 1, at.position(),
                    { moment: "link", target: String(person.ref()), plates: plates, motes: motes, scale: scale,
                        path: [String(actor.ref()), String(person.ref())] }, 26, "wideguard:link:" + String(person.ref()));
            }
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), wideguardRaiseText,
                [Math.round(capacity), covered.length, Math.round(window / 20)], 34);
            world.sound("minecraft:block.glass.place", body.position(), 16, "{}");
            world.sound("minecraft:item.shield.block", body.position(), 14, "{}");
            done(action);
        }
    });

    // 墙散：身份确实不再存在（到期或被清除）时，当刻撤掉这个人身上的吸收池（不等 8 刻巡检），再播一次收束留痕。
    // 刷新过程中的旧 revision 不在这里误撤；旧的池由 pulse 的精确锚检查在 8 刻内自行收掉。
    WorldCombat.on("world_combat:move_wideguard/fall", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== wideguardEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, wideguardEffect) === null) wideguardDrop(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, wideguardScene, 1, body.position(), { moment: "fall", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), wideguardFallText, [], 22);
    });
}
