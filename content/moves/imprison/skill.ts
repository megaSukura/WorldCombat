/** imprison：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 领域重扫间隔与印记时长：印记比间隔长一点，目标短暂走位也能撑住；真正离开后由守卫尽快解绑。 */
    const imprisonBrandInterval = 10;
    const imprisonBrandTicks = 26;

    /** 当前的领域源（施法者身上）实例；封印印记据此判断自己的领域是否还成立。 */
    function imprisonMarkOf(world: CombatWorld, caster: CombatActor): CombatEffectView | null {
        const views = world.effects(caster, imprisonMark);
        return views.length ? views[0] : null;
    }

    /** 领域源的机读旁挂：记下半径、招式名单与时限，供持续画面与重扫读取。 */
    WorldCombat.effect(imprisonMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.radius !== "number" || !isFinite(value.radius) || value.radius < 1) throw new Error("Invalid imprison radius");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid imprison window");
        if (!Array.isArray(value.moves)) throw new Error("Invalid imprison moves");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    // 领域在时按间隔重扫、并把随身体移动的边界绑在领域源自己的生命周期上：牛奶或 /effect clear 提前关掉领域时，画面随之一同收。
    WorldCombat.effectHandler(imprisonMark, "start", function (effect) { imprisonHold(effect); });
    WorldCombat.effectHandler(imprisonMark, "hold", function (effect) { imprisonHold(effect); });
    WorldCombat.effectHandler(imprisonMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 封印印记的机读旁挂：记下被锁的招式 id、所属领域源实例与来源；判定看共享身份加这份名单。 */
    WorldCombat.effect(imprisonBrand, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (!Array.isArray(value.moves) || typeof value.caster !== "string") throw new Error("Invalid imprison brand");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(imprisonBrand, "start", function (effect) { effect.schedule("guard", "guard", imprisonBrandInterval, "{}"); });
    WorldCombat.effectHandler(imprisonBrand, "guard", function (effect) { imprisonGuard(effect); });
    WorldCombat.effectHandler(imprisonBrand, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(imprisonBrand, "operation:world_combat:refresh", function (effect) {
        if (String(effect.caller().ref()) !== String(effect.source().ref())) { effect.reject("not-owned"); return; }
        effect.state(effect.input()); effect.remaining(imprisonBrandTicks);
    });
    WorldCombat.effectHandler(imprisonBrand, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        // 多个封印者联合落印时，只撤掉自己这一份；仍有别人的印就保留共享身份。
        const remaining = world.effects(victim, imprisonBrand).filter(function (view) { return view.id() !== effect.id(); });
        if (remaining.length === 0) MobEffects.consume(world, victim, imprisonSealed);
    });

    function imprisonData(world: CombatWorld, actor: CombatActor, id: string): any {
        const views = world.effects(actor, id);
        if (!views.length) return null;
        if (id !== imprisonBrand) return JSON.parse(String(views[0].data()));
        const moves: string[] = [];
        views.forEach(view => JSON.parse(view.data()).moves.forEach((move: string) => { if (moves.indexOf(move) < 0) moves.push(move); }));
        return { moves };
    }

    /** 一个战斗者当前有效的招式 id 名单（含临时层）；非宝可梦没有招式表，只读它真正命中过的最后一次攻击类型。 */
    export function imprisonKnown(world: CombatWorld, actor: CombatActor): string[] {
        if (!world.valid(actor)) return [];
        if (String(actor.domain()) !== "cobblemon") {
            const last = DamageSemantics.recentAttack(world, actor, 1200);
            return last ? [last.contact ? "native:contact" : "native:ranged"] : [];
        }
        const pokemon = CobblemonCombat.pokemon(actor), layers = NativeModifiers.read(world, actor), ids: string[] = [];
        for (let slot = 0; slot < pokemon.moveSlots(); slot++) {
            const move = pokemon.move(slot);
            if (move === null) continue;
            const id = layers.moves && layers.moves[String(slot)] || String(move.id());
            if (ids.indexOf(id) < 0) ids.push(id);
            const template = CobblemonCombat.moveTemplate(id);
            if (String(template.category()) !== "status") {
                const kind = NativeLoadout.facts(template).flags.contact ? "native:contact" : "native:ranged";
                if (ids.indexOf(kind) < 0) ids.push(kind);
            }
        }
        return ids;
    }
    function imprisonOverlap(mine: string[], theirs: string[]): string[] {
        const shared: string[] = [];
        for (let i = 0; i < mine.length; i++) if (theirs.indexOf(mine[i]) >= 0 && shared.indexOf(mine[i]) < 0) shared.push(mine[i]);
        return shared;
    }
    /** 只保留对非宝可梦有意义的普通攻击类别；宝可梦那侧另有同名招。 */
    function imprisonShared(world: CombatWorld, caster: CombatActor, victim: CombatActor): string[] {
        return imprisonOverlap(imprisonKnown(world, caster), imprisonKnown(world, victim))
            .filter(id => String(victim.domain()) !== "cobblemon" || id.indexOf("native:") !== 0);
    }

    /** 给一个对手落印：挂共享身份，并把两者共有的招式名单写进机读旁挂；首次落下时播画面。 */
    function imprisonSeal(world: CombatWorld, caster: CombatActor, victim: CombatActor, shared: string[]): void {
        const casterRef = String(caster.ref());
        const own = world.effects(victim, imprisonBrand).filter(view => JSON.parse(view.data()).caster === casterRef);
        const fresh = own.length === 0;
        const mark = imprisonMarkOf(world, caster);
        const markId = mark === null ? 0 : mark.id();
        if (!CombatStatus.apply(world, victim, imprisonStatus, imprisonSealed, imprisonBrandTicks, 0)) return;
        const payload = JSON.stringify({ moves: shared, caster: casterRef, mark: markId });
        if (own.length) world.operation(own[0].id(), "world_combat:refresh", payload);
        else world.effect(imprisonBrand, victim, payload, imprisonBrandTicks);
        if (!fresh) return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, imprisonScene, 1, body.position(),
            { moment: "brand", target: String(victim.ref()), count: shared.length, moves: shared, caster: String(caster.ref()) }, 26);
    }

    /** 撤掉一名对手身上属于这名施法者的封印与旁挂；别的封印者的贡献保持不动。 */
    function imprisonClear(world: CombatWorld, victim: CombatActor, caster: CombatActor): void {
        const casterRef = String(caster.ref());
        world.effects(victim, imprisonBrand).forEach(view => {
            if (JSON.parse(view.data()).caster === casterRef) world.operation(view.id(), "world_combat:dispel", "{}");
        });
    }

    /** 领域重扫：领域内每个可见且可达的敌对个体，凡与施法者共有招式就落印，不再共有就撤印。返回落中的数量。 */
    function imprisonSweep(world: CombatWorld, caster: CombatActor, mine: string[], radius: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        // visibleOnly=true 用原生视线：隔厚墙的隐藏敌不在名单里，不会被远距离落印。
        const near = world.query(body.position(), radius, true);
        let hit = 0;
        for (let i = 0; i < near.length; i++) {
            const other = near[i];
            if (String(other.ref()) === String(caster.ref()) || !world.valid(other) || world.friendly(other)) continue;
            const shared = imprisonOverlap(mine, imprisonKnown(world, other)).filter(id => String(other.domain()) !== "cobblemon" || id.indexOf("native:") !== 0);
            if (shared.length === 0) { imprisonClear(world, other, caster); continue; }
            imprisonSeal(world, caster, other, shared);
            hit++;
        }
        return hit;
    }

    /** 领域在时每 10 刻重扫一次并把边界绑到领域源上；招式名单每帧按当前实际策略重读，提示与判定同步。 */
    function imprisonHold(effect: CombatEffect): void {
        const world = effect.world(), caster = effect.target();
        if (!world.valid(caster)) { effect.end(); return; }
        const body = world.observe(caster);
        if (body === null) { effect.end(); return; }
        const mark = JSON.parse(effect.state());
        const known = imprisonKnown(world, caster);
        imprisonSweep(world, caster, known, mark.radius);
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_imprison/ring", imprisonScene, 1, body.position(),
            { moment: "hold", target: String(caster.ref()), radius: mark.radius, scale: Math.max(0.5, mark.radius / 6),
                seals: mark.seals || 0, shared: known.length, moves: known });
        effect.schedule("hold", "hold", imprisonBrandInterval, "{}");
    }

    /** 印记守卫：领域源换了、范围失效或视线被掩体切断，就立刻解绑自己这一份，不靠旧 26 刻继续隔墙禁招。 */
    function imprisonGuard(effect: CombatEffect): void {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const caster = world.actor(String(data.caster));
        if (caster === null || !world.valid(caster)) { effect.end(); return; }
        const markView = imprisonMarkOf(world, caster);
        if (markView === null || Number(data.mark) !== markView.id()) { effect.end(); return; }
        const mark = JSON.parse(String(markView.data()));
        const casterBody = world.observe(caster), victimBody = world.observe(victim);
        if (casterBody === null || victimBody === null) { effect.end(); return; }
        if (casterBody.position().minus(victimBody.position()).length() > mark.radius + 0.6
            || !world.clear(casterBody.position(), victimBody.position())) { effect.end(); return; }
        if (imprisonShared(world, caster, victim).length === 0) { effect.end(); return; }
        effect.remaining(imprisonBrandTicks);
        effect.schedule("guard", "guard", imprisonBrandInterval, "{}");
    }

    // 封锁：带着封印身份的活体，在提交与施法者共有的招式时被顶回去。
    // 这条贡献走共享动作策略，原生配招、通用动作与玩家共用同一个提交闸门；对任何带身份的活体成立。
    // 原生普攻只按已识别出的近/远类别判定，不猜测未知 Boss 的技能表；每次只阻这一下，不冻结整个 AI。
    CombatStatus.actions.define({ id: "world_combat:move_imprison/policy", apply: function (context) {
        if (!CombatStatus.has(context.world, context.actor, imprisonStatus)) return;
        const data = imprisonData(context.world, context.actor, imprisonBrand);
        if (data === null || !data.moves) return;
        if (context.phase === "damage" && DamageSemantics.read(context.metadata).attack) {
            const contact = DamageSemantics.read(context.metadata).contact;
            const kind = contact ? "native:contact" : "native:ranged";
            if (data.moves.indexOf(kind) >= 0) {
                context.blocked.imprisoned = true;
                context.detail.imprisoned = { native: true, category: contact ? "contact" : "ranged", type: String(context.metadata.damageType || "") };
            }
        } else if (context.move && typeof context.move.id === "function" && data.moves.indexOf(String(context.move.id())) >= 0) {
            context.blocked.imprisoned = true;
            context.detail.imprisoned = { native: false, move: String(context.move.id()) };
        }
    } });

    // 被判回的那一下要看得见：普通攻击与宝可梦共用同一张回执，落一次锁闪并写清被锁的那一手或攻击类别。
    // 拒绝只是拒绝，不额外减速、不打断移动。
    CombatStatus.rejected.define({ id: "world_combat:move_imprison/reject", applies: function (context) {
        return String(context.reason) === "imprisoned";
    }, apply: function (context) {
        const world = context.world, actor = context.actor;
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const details = context.details || {};
        const move = typeof details.move === "string" ? String(details.move) : "";
        const category = typeof details.category === "string" ? String(details.category) : "contact";
        const data = imprisonData(world, actor, imprisonBrand);
        const arg = move ? { key: "cobblemon.move." + move, fallback: move }
            : { key: "world_combat.move.imprison.kind." + category, fallback: category };
        WorldFeedback.emit(world, imprisonScene, 1, body.position(),
            { moment: "reject", target: String(actor.ref()), kind: move ? "move" : category,
                count: data && data.moves ? data.moves.length : 1, moves: data && data.moves ? data.moves : [] }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), imprisonBlockText, [arg], 26);
    } });

    define({
        id: imprisonId,
        cooldownParameter: "recharge",
        name: "封印",
        description: "展开随自己移动的封印领域，封住敌人与你共有的招式。对普通敌人，近战和远程攻击会按自己会的攻击类型被封住。",
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
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[imprisonId], detail: { values: config } };
            return { radius: p(imprisonId, "imprisonRadius", context), geometry: "area", style: "seal", color: 0x7C6CFF, label: "封印领域" };
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

    // 结束：领域收起，领域内的印记一并撤掉；到期是自行散去，被清除是被人硬压下去，画面不同。
    WorldCombat.on("world_combat:move_imprison/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== imprisonAura) return;
        const world = event.world(), caster = event.actor();
        if (!world.valid(caster) || MobEffects.read(world, caster, imprisonAura) !== null) return;
        const expired = String(data.cause) === "expired";
        const mark = imprisonData(world, caster, imprisonMark);
        const radius = mark === null ? 8 : mark.radius;
        const body = world.observe(caster);
        if (body !== null) {
            const near = world.query(body.position(), radius + 2, false);
            for (let i = 0; i < near.length; i++) if (world.valid(near[i])) imprisonClear(world, near[i], caster);
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
