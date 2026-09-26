/**
 * 戏法防守 / craftyshield — 执行组织与结算。
 *
 * 核心念头：在身前织起一片会转弯的戏法符阵——敌方一道变化招式递过来，符阵上跳出几枚法印把它整条拨开；
 *   符阵由有限的法印撑起，挡掉几条就织不住，散了。伤害招式直接穿阵而过。
 *
 * 两幕：
 *   织（windup 播「勾勒符阵」，提交前只观察与预告，打断不花代价）。
 *   张（提交后）：施法者与半径内的友方各挂共享身份 world_combat:status/craftyshield 的真实 MobEffect，
 *     amplifier 记「还剩几次拨挡」；并各挂一份标记（法印数、半径缩放、施法者）供画面读取。
 * 拨挡：带身份的活体被敌方变化招式瞄上时，该招在提交点被拒绝；提交点是只读作用域，只记下这一手，
 *   由目标身上身份的下一刻 tick（可写）播一记拨挡画面并扣一次拨挡次数；次数用尽即收阵。
 * 结束：身份到期或被清除时清掉标记、整阵收拢；伤害招式不带 category=status，根本不进这条拦截。
 */
namespace PokemonSkills {
    const craftyShieldScene = "world_combat:move_craftyshield";
    const craftyShieldEffect = "world_combat:crafty_shield";
    const craftyShieldMark = "world_combat:crafty_mark";
    const craftyShieldStatus = "craftyshield";
    const craftyShieldRaiseText = "world_combat.move.craftyshield.text.raise";
    const craftyShieldDeflectText = "world_combat.move.craftyshield.text.deflect";
    const craftyShieldFallText = "world_combat.move.craftyshield.text.fall";
    /** 表现里的参考半径：`data.scale = 实际遮蔽半径 / 这个数`。 */
    const craftyShieldReferenceRadius = 3.2;
    /** 被拒回的变化招式：提交点只读，先记在这里，等目标身上身份下一次 tick（可写作用域）再播画面并扣次数。
     *  同一手（同一 action 实例）可能触发多次提交回调，按实例去重，避免一招被扣多次。 */
    const craftyHexes: { [ref: string]: { at: number; move: string; instances: number[] } } = Object.create(null);
    /** 观察到的敌方变化招式出手：攻击者 ref -> 最近一次 category=status 出手的 tick。AI 的「已见敌用状态干扰」判据。 */
    const craftyStatusSeen: { [ref: string]: number } = Object.create(null);
    /** 攻击者在 maxAge 刻内是否真的出手过变化招式。 */
    export function craftyShieldStatusSeen(ref: string, tick: number, maxAge: number): boolean {
        const at = craftyStatusSeen[ref];
        return at !== undefined && tick - at <= maxAge;
    }

    function craftyShieldMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, craftyShieldMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function craftyShieldReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, craftyShieldMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }

    WorldCombat.effect(craftyShieldMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["glyphs", "scale", "charges"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid crafty shield mark: " + key);
        });
        if (typeof value.caster !== "string") throw new Error("Invalid crafty shield source");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    /** 符阵持续画面绑在承载它的这枚标记效果上：标记由本来源创建，随它到期、被驱散或收阵一起清理。
     *  余量越低符阵越淡，剩余法印数就是画面强度；带身份的 MobEffect 一旦消失，标记也收。 */
    function craftyShieldHoldWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        if (!world.valid(target)) { effect.end(); return; }
        const carrier = MobEffects.read(world, target, craftyShieldEffect);
        const body = world.observe(target);
        if (carrier === null || body === null) { effect.end(); return; }
        const mark: any = JSON.parse(effect.state()), total = Math.max(1, Math.round(mark.charges) || 1);
        const remaining = Math.max(0, carrier.amplifier());
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_craftyshield/hold/" + String(target.ref()),
            craftyShieldScene, 1, body.position(), { moment: "hold", target: String(target.ref()),
                glyphs: Math.max(8, Math.round(mark.glyphs)), remaining: remaining, total: total,
                intensity: Math.max(0.2, Math.min(1.5, remaining / total + 0.3)) });
        effect.schedule("watch", "watch", 15, "{}");
    }
    WorldCombat.effectHandler(craftyShieldMark, "start", craftyShieldHoldWatch);
    WorldCombat.effectHandler(craftyShieldMark, "watch", craftyShieldHoldWatch);
    WorldCombat.effectHandler(craftyShieldMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 「已见敌用状态干扰」的观察点：任何敌人提交变化招式（category=status）都记一笔，供 AI 判断变化压力。
    // 提交点是只读作用域，这里只写本单元自己的观察表、不碰世界；没有这条事实时 AI 不凭空当成变化威胁。
    WorldCombat.on("world_combat:move_craftyshield/watch", "world_combat:before_commit", "", function (event: CombatWorldEvent) {
        const action = event.action(); if (action === null) return;
        const move = NativeLoadout.executing(action); if (move === null) return;
        if (String(move.category()) !== "status") return;
        craftyStatusSeen[String(event.actor().ref())] = event.world().tick();
    });

    // 提交点：敌方变化招式瞄上带身份的目标时整条顶回。priority 不限——变化招式无论先制与否都挡；
    // 伤害招式不是 category=status，不进这条。提交点是只读作用域，这里只拒绝并记下这一手。
    WorldCombat.on("world_combat:move_craftyshield/hex", "world_combat:before_commit", "", function (event: CombatWorldEvent) {
        const action = event.action(); if (action === null) return;
        const move = NativeLoadout.executing(action); if (move === null) return;
        if (String(move.category()) !== "status") return;
        const world = event.world(), target = action.target();
        if (target === null) return;
        if (String(event.actor().key()) === String(target.key())) return;
        if (world.friendly(target)) return;
        if (!CombatStatus.has(world, target, craftyShieldStatus)) return;
        event.reject("craftyshield");
        // 一次真实被拒的出手记一笔；同一 action 实例的多个提交回调只算一次，避免同一招重复扣。
        const ref = String(target.ref()), instance = action.id(), pending = craftyHexes[ref];
        if (pending === undefined) craftyHexes[ref] = { at: world.tick(), move: String(move.id()), instances: [instance] };
        else if (pending.instances.indexOf(instance) < 0) { pending.instances.push(instance); pending.move = String(move.id()); }
    });

    // 兑现点：目标身上身份每 tick 收到一次可写事件。把记下的每一次真实被拒出手各扣一枚法印；
    // 同一招多个回调已按实例去重。扣到 0 就收阵；否则按剩余枚数重挂身份，持续画面由承载标记自己续。
    WorldCombat.on("world_combat:move_craftyshield/weave", "world_combat:mob_effect_tick", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== craftyShieldEffect) return;
        const world = event.world(), actor = event.actor(), ref = String(actor.ref());
        const effect = MobEffects.read(world, actor, craftyShieldEffect);
        if (effect === null) { delete craftyHexes[ref]; return; }
        const pending = craftyHexes[ref];
        if (pending === undefined) return;
        delete craftyHexes[ref];
        const before = Math.max(0, effect.amplifier());
        const spent = Math.min(before, Math.max(1, pending.instances.length));
        const remaining = before - spent;
        const body = world.observe(actor);
        const mark = craftyShieldMarkOf(world, actor);
        if (body !== null && world.tick() - pending.at <= 20) {
            // 一次拨挡消一枚：只让一枚法印的粒子闪开，并亮出扣完后的余量。
            const perSeal = Math.max(3, Math.round((mark ? mark.glyphs : 22) / Math.max(1, Math.round(mark ? mark.charges : 1))));
            WorldFeedback.emit(world, craftyShieldScene, 1, body.position(),
                { moment: "deflect", target: ref, glyphs: perSeal, remaining: remaining,
                    total: Math.max(1, Math.round(mark ? mark.charges : 1)), move: pending.move }, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), craftyShieldDeflectText, [remaining, Math.max(1, Math.round(mark ? mark.charges : 1))], 24);
            world.sound("minecraft:entity.illusioner.mirror_move", body.position(), 12, "{}");
        }
        if (remaining <= 0) {
            MobEffects.consume(world, actor, craftyShieldEffect);
            craftyShieldReleaseMark(world, actor);
            if (body !== null) {
                WorldFeedback.emit(world, craftyShieldScene, 1, body.position(), { moment: "collapse", target: ref }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), craftyShieldFallText, [], 22);
            }
            return;
        }
        MobEffects.apply(world, actor, craftyShieldEffect, Math.max(20, effect.duration()), remaining);
    });

    // 收：身份到期或被清除时清掉标记、整阵收拢。走完自己的时间与被外力解除是两条岔路，画面不同。
    WorldCombat.on("world_combat:move_craftyshield/fall", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== craftyShieldEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        delete craftyHexes[String(actor.ref())];
        const mark = craftyShieldMarkOf(world, actor);
        if (mark !== null) craftyShieldReleaseMark(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        const expired = String(data.cause) === "expired";
        WorldFeedback.emit(world, craftyShieldScene, 1, body.position(),
            { moment: "fall", target: String(actor.ref()), scale: mark ? mark.scale : 1, expired: expired ? 1 : 0 }, 22);
        if (expired) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), craftyShieldFallText, [], 22);
    });

    function craftyShieldScale(radius: number): number {
        return Math.max(0.5, Math.min(2.2, (radius || craftyShieldReferenceRadius) / craftyShieldReferenceRadius));
    }

    /** 给施法者与半径内友方各挂一份符阵（身份 amplifier=拨挡次数 + 标记）；返回这次罩住的人数。 */
    function craftyShieldCover(world: CombatWorld, caster: CombatActor, radius: number, ticks: number,
        charges: number, glyphs: number, scale: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        const marker = { glyphs: glyphs, scale: scale, charges: charges, caster: String(caster.ref()) };
        function protect(actor: CombatActor): boolean {
            if (MobEffects.apply(world, actor, craftyShieldEffect, ticks, charges) === null) return false;
            craftyShieldReleaseMark(world, actor);
            world.effect(craftyShieldMark, actor, JSON.stringify(marker), ticks);
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
        id: "craftyshield",
        cooldownParameter: "wait",
        name: "戏法防守",
        description: "织起一片戏法符阵，替自己与身边的队友把变化招式整条拨开；符阵由有限的法印撑起，拨掉几条就散，伤害招式直接穿阵而过。",
        uses: ["挡下成片铺来的异常与弱化招式", "在对手的挑衅、封锁落下前先织阵", "护住正要进场的队友不被变化招式拿捏"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 5,
        active: 1,
        recover: 5,
        cooldown: 140,
        style: "ward",
        stationary: true,
        defaults: { weave: 1, ai: { maxChase: 13, opening: "incoming", leaveStation: false } },
        fields: [
            field(pathOf("weave"), "织法", "choice", {
                options: [
                    { value: 1, label: "细纹" },
                    { value: 0, label: "粗纹" }
                ],
                help: "细纹：拨挡次数 ×1.3、时长 ×1.15、半径 ×0.9，代价是起手 +2 刻、冷却 ×1.1——多拨几条、罩得紧；粗纹：半径 ×1.2，拨挡 ×0.75、时长 ×0.85，换来起手 −1 刻、冷却 ×0.88——摊得开、起得快。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("craftyshield", "radius", pokemon) : 3.2, geometry: "area", style: "ward", color: 0xC9A0E8,
                label: config && Number(config.weave) === 1 ? "戏法防守 · 细纹" : "戏法防守 · 粗纹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["craftyshield"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(2, Math.round(p("craftyshield", "tempo", context))),
                recover: Math.round(p("craftyshield", "aftercast", context)),
                cooldown: Math.round(p("craftyshield", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_craftyshield:trace", craftyShieldScene, 1, action.origin(),
                JSON.stringify({ moment: "trace", weave: config && Number(config.weave) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const charges = Math.max(2, Math.round(p("craftyshield", "charges", action)));
            const window = Math.max(40, Math.round(p("craftyshield", "window", action)));
            const radius = Math.max(1.6, p("craftyshield", "radius", action));
            const glyphs = Math.max(10, Math.round(p("craftyshield", "glyphs", action)));
            const scale = craftyShieldScale(radius);
            const reached = craftyShieldCover(world, actor, radius, window, charges, glyphs, scale);
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, craftyShieldScene, 1, feet,
                { moment: "raise", target: String(actor.ref()), glyphs: glyphs, charges: charges, radius: radius, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, glyphs / 28 + 0.4)) }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), craftyShieldRaiseText,
                [charges, reached, Math.round(window / 20)], 34);
            world.sound("minecraft:block.amethyst_block.chime", body.position(), 16, "{}");
            done(action);
        }
    });
}
