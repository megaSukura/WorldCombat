/**
 * 封印 / imprison —— 执行组织与家族行为。
 *
 * 核心念头：把自己会的每一手锁进一枚悬浮的封印，封印落地展开成领域；领域内的对手，凡是用施法者也会的
 *   招式，都被顶回去。它不是点名封一手，而是拿自己的招式表当封印——双方重合的那几手一起失效。
 *
 * 一幕半：起（windup，提交前）封印在施法者头顶聚起；落（提交后）封印砸进地面、铺开领域，
 *   领域内每个与施法者共有招式的对手都被落印；持续期每 10 刻重扫一次，离开领域或不再重合自然撤印。
 *
 * 世界化：领域源是施法者身上共享身份 world_combat:status/imprison 的真实 MobEffect；
 *   被锁的对手挂带同一身份的「封印印记」，印记旁挂写清共有招式名单，共享动作策略在提交点把它们顶回去。
 *   领域随施法者移动；到期自行散去，被牛奶／清除时一并撤印。
 * 反制：印章只落在共有招式上，换一手不在名单里的招就能打；离开领域或解除施法者的封印即可脱身。
 */
namespace PokemonSkills {
    /** 领域重扫间隔与印记时长：印记比间隔长一点，目标短暂走位也能撑住，真正离开后自然过期。 */
    const imprisonBrandInterval = 10;
    const imprisonBrandTicks = 26;

    /** 领域源的机读旁挂：记下半径、招式名单与时限，供持续画面与重扫读取。 */
    WorldCombat.effect(imprisonMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.radius !== "number" || !isFinite(value.radius) || value.radius < 1) throw new Error("Invalid imprison radius");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid imprison window");
        if (!Array.isArray(value.moves)) throw new Error("Invalid imprison moves");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(imprisonMark, "start", function () { });
    WorldCombat.effectHandler(imprisonMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 封印印记的机读旁挂：记下被锁的招式 id 与来源；判定看共享身份加这份名单。 */
    WorldCombat.effect(imprisonBrand, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (!Array.isArray(value.moves) || typeof value.caster !== "string") throw new Error("Invalid imprison brand");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(imprisonBrand, "start", function () { });
    WorldCombat.effectHandler(imprisonBrand, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function imprisonView(world: CombatWorld, actor: CombatActor, id: string): CombatEffectView | null {
        const views = world.effects(actor, id);
        return views.length ? views[0] : null;
    }
    function imprisonData(world: CombatWorld, actor: CombatActor, id: string): any {
        const view = imprisonView(world, actor, id);
        return view === null ? null : JSON.parse(String(view.data()));
    }

    /** 一个战斗者当前有效的招式 id 名单（含临时层）；非宝可梦没有招式表，返回空。 */
    export function imprisonKnown(world: CombatWorld, actor: CombatActor): string[] {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return [];
        const pokemon = CobblemonCombat.pokemon(actor), layers = NativeModifiers.read(world, actor), ids: string[] = [];
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move === null) continue;
            const id = layers.moves && layers.moves[String(slot)] || String(move.id());
            if (ids.indexOf(id) < 0) ids.push(id);
        }
        return ids;
    }
    function imprisonOverlap(mine: string[], theirs: string[]): string[] {
        const shared: string[] = [];
        for (let i = 0; i < mine.length; i++) if (theirs.indexOf(mine[i]) >= 0 && shared.indexOf(mine[i]) < 0) shared.push(mine[i]);
        return shared;
    }

    /** 给一个对手落印：挂共享身份，并把两者共有的招式名单写进机读旁挂；首次落下时播画面。 */
    function imprisonSeal(world: CombatWorld, caster: CombatActor, victim: CombatActor, shared: string[]): void {
        const fresh = imprisonView(world, victim, imprisonBrand) === null;
        if (!CombatStatus.apply(world, victim, imprisonStatus, imprisonSealed, imprisonBrandTicks, 0, { unique: true })) return;
        const stale = world.effects(victim, imprisonBrand);
        for (let i = 0; i < stale.length; i++) world.operation(stale[i].id(), "world_combat:dispel", "{}");
        world.effect(imprisonBrand, victim, JSON.stringify({ moves: shared, caster: String(caster.ref()) }), imprisonBrandTicks);
        if (!fresh) return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, imprisonScene, 1, body.position(),
            { moment: "brand", target: String(victim.ref()), count: shared.length, moves: shared, caster: String(caster.ref()) }, 26);
    }

    /** 撤掉一名对手的封印身份与旁挂（不再重合、施法者离开或领域结束时）。 */
    function imprisonClear(world: CombatWorld, victim: CombatActor): void {
        const effect = MobEffects.read(world, victim, imprisonSealed);
        if (effect !== null) world.removeMobEffect(victim, imprisonSealed, effect.key());
        const views = world.effects(victim, imprisonBrand);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
    }

    /** 领域重扫：领域内每个敌对宝可梦，凡与施法者共有招式就落印，不再共有就撤印。返回落中的数量。 */
    function imprisonSweep(world: CombatWorld, caster: CombatActor, mine: string[], radius: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        const near = world.query(body.position(), radius, false);
        let hit = 0;
        for (let i = 0; i < near.length; i++) {
            const other = near[i];
            if (String(other.ref()) === String(caster.ref()) || !world.valid(other) || world.friendly(other)) continue;
            const shared = imprisonOverlap(mine, imprisonKnown(world, other));
            if (shared.length === 0) { imprisonClear(world, other); continue; }
            imprisonSeal(world, caster, other, shared);
            hit++;
        }
        return hit;
    }

    // 封锁：带着封印身份的活体，在提交与施法者共有的招式时被顶回去。
    // 这条贡献走共享动作策略，原生配招、通用动作与玩家共用同一个提交闸门；对任何带身份的活体成立。
    CombatStatus.actions.define({ id: "world_combat:move_imprison/policy", apply: function (context) {
        if (!context.move || typeof context.move.id !== "function") return;
        if (!CombatStatus.has(context.world, context.actor, imprisonStatus)) return;
        const data = imprisonData(context.world, context.actor, imprisonBrand);
        if (data === null || !data.moves) return;
        if (data.moves.indexOf(String(context.move.id())) >= 0) context.blocked.imprisoned = true;
    } });

    // 被判回的那一下要看得见：在真正的封锁之前放一段「顶回去」的画面与浮字。
    WorldCombat.on("world_combat:move_imprison/block", "world_combat:before_commit", "", function (event) {
        const world = event.world(), actor = event.actor(), action = event.action();
        if (action === null || String(actor.domain()) !== "cobblemon") return;
        if (!CombatStatus.has(world, actor, imprisonStatus)) return;
        const executing = NativeLoadout.executing(action);
        if (executing === null) return;
        const data = imprisonData(world, actor, imprisonBrand);
        if (data === null || !data.moves || data.moves.indexOf(String(executing.id())) < 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, imprisonScene, 1, body.position(),
            { moment: "reject", target: String(actor.ref()), count: data.moves.length, moves: data.moves }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), imprisonBlockText,
            [{ key: "cobblemon.move." + String(executing.id()), fallback: String(executing.id()) }], 26);
    });

    define({
        id: imprisonId,
        name: "封印",
        description: "把自己会的每一手锁进一枚封印并铺成领域；领域内的对手，凡是用你也会的招式，都被顶回去。换一手不在名单里的招就能打，离开领域或解除施法者的封印即可脱身。",
        uses: ["把与对手重合的招式整片锁死", "压住会同样招式的镜像 / 同类对手", "逼对手离开它熟练的那几手"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 12,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "seal",
        stationary: true,
        defaults: { scope: 1, ai: { maxChase: 14, leaveStation: false } },
        fields: [
            field(pathOf("scope"), "封锁取向", "choice", {
                options: [{ value: 1, label: "固守" }, { value: 0, label: "广布" }],
                help: "固守：领域收拢 ×0.8、时长 ×1.35、冷却 ×1.15，钉住一片久一点。广布：领域铺开 ×1.25、时长 ×0.75、冷却 ×0.9，罩住更多人却撑得更短。"
            })
        ],
        indicator: function () {
            return { radius: 6, geometry: "area", style: "seal", color: 0x7C6CFF, label: "封印领域" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[imprisonId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deep = read(config, ["scope"]) === 1;
            return {
                prepare: p(imprisonId, "tempo", context),
                recover: p(imprisonId, "aftercast", context),
                cooldown: Math.round(p(imprisonId, "recharge", context) * (deep ? 1.15 : 0.9)),
                active: 1,
                range: 1
            };
        },
        ready: function (action) {
            return String(action.actor().domain()) === "cobblemon" ? "" : "no-seal";
        },
        windup: function (action, config, prepare) {
            const actor = action.actor();
            action.present("world_combat:move_imprison:windup", imprisonScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(actor.ref()),
                    radius: p(imprisonId, "imprisonRadius", action), seals: p(imprisonId, "sealCount", action),
                    scope: read(config, ["scope"]) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const radius = p(imprisonId, "imprisonRadius", action);
            const ticks = Math.max(40, Math.round(p(imprisonId, "imprisonTicks", action)));
            const seals = Math.max(4, Math.round(p(imprisonId, "sealCount", action)));
            const mine = imprisonKnown(world, self);
            MobEffects.apply(world, self, imprisonAura, ticks, 0);
            const stale = world.effects(self, imprisonMark);
            for (let i = 0; i < stale.length; i++) world.operation(stale[i].id(), "world_combat:dispel", "{}");
            world.effect(imprisonMark, self, JSON.stringify({ radius: radius, max: ticks, seals: seals, moves: mine,
                scope: read(config, ["scope"]) === 1 ? 1 : 0 }), ticks);
            const affected = imprisonSweep(world, self, mine, radius);
            WorldFeedback.emit(world, imprisonScene, 1, body.position(),
                { moment: "seal", target: String(self.ref()), radius: radius, scale: Math.max(0.5, radius / 6),
                    seals: seals, shared: mine.length, affected: affected }, 40);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), imprisonSealText, [Math.round(ticks / 20)], 40);
            sound(action, "minecraft:block.respawn_anchor.charge");
            done(action);
        }
    });

    // 持续：领域每 10 刻重扫一次（覆盖走位变化），每 20 刻续一次领域环，数量沿用落印时算出的数。
    WorldCombat.on("world_combat:move_imprison/hold", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== imprisonAura) return;
        const world = event.world(), caster = event.actor();
        if (!world.valid(caster)) return;
        const mark = imprisonData(world, caster, imprisonMark);
        if (mark === null) return;
        if (world.tick() % imprisonBrandInterval === 0) imprisonSweep(world, caster, imprisonKnown(world, caster), mark.radius);
        if (world.tick() % 20 !== 0) return;
        const body = world.observe(caster);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_imprison/ring/" + String(caster.ref()), imprisonScene, 1, body.position(),
            { moment: "hold", target: String(caster.ref()), radius: mark.radius, scale: Math.max(0.5, mark.radius / 6),
                seals: mark.seals || 0, shared: mark.moves.length, moves: mark.moves }, 40);
    });

    // 结束：领域收起，领域内的印记一并撤掉；到期是自行散去，被清除是被人硬压下去，画面不同。
    WorldCombat.on("world_combat:move_imprison/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== imprisonAura) return;
        const world = event.world(), caster = event.actor();
        if (!world.valid(caster)) return;
        const expired = String(data.cause) === "expired";
        const mark = imprisonData(world, caster, imprisonMark);
        const radius = mark === null ? 8 : mark.radius;
        const body = world.observe(caster);
        if (body !== null) {
            const near = world.query(body.position(), radius + 2, false);
            for (let i = 0; i < near.length; i++) if (world.valid(near[i])) imprisonClear(world, near[i]);
        }
        const views = world.effects(caster, imprisonMark);
        for (let i = 0; i < views.length; i++) world.operation(views[i].id(), "world_combat:dispel", "{}");
        if (body === null) return;
        WorldFeedback.emit(world, imprisonScene, 1, body.position(),
            { moment: expired ? "fade" : "snap", target: String(caster.ref()), expired: expired ? 1 : 0, radius: radius }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), expired ? imprisonFadeText : imprisonSnapText, [], 30);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 14, "{}");
    });
}
