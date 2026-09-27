/** imprison：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 领域巡检与印记复核间隔；印记自检比巡检长一点，短暂走位也能撑住，真正离开后由守卫解绑。 */
    const imprisonBrandInterval = 10;
    const imprisonBrandTicks = 26;
    /** 被封类别的合法取值。 */
    const imprisonContact = "contact";
    const imprisonRanged = "ranged";

    /**
     * 本场领域已消费的敌名额：领域实例 id -> 敌人 ref -> true。
     * 领域一开就建立、关掉即清，与印记是否仍在身上无关；敌人离圈再入也保留已用份额，不再刷新。
     */
    const imprisonSpent: { [mark: number]: { [ref: string]: boolean } } = Object.create(null);
    function imprisonSpentOf(mark: number): { [ref: string]: boolean } {
        return imprisonSpent[mark] || (imprisonSpent[mark] = Object.create(null));
    }

    /** 本次封锁的单一类别；缺省按接触处理。 */
    function imprisonCategory(config: any): string {
        const value = config && config.category;
        return value === imprisonRanged ? imprisonRanged : imprisonContact;
    }

    /** 当前的领域源（施法者身上）实例；判定与画面据此确认领域是否还成立。 */
    function imprisonMarkOf(world: CombatWorld, caster: CombatActor): CombatEffectView | null {
        const views = world.effects(caster, imprisonMark);
        return views.length ? views[0] : null;
    }
    /** 只认与印记记下的实例 id 一致的那一份领域；旧领域倒下后旧印记立即失效。 */
    function imprisonMarkView(world: CombatWorld, caster: CombatActor, mark: number): CombatEffectView | null {
        const views = world.effects(caster, imprisonMark);
        for (let i = 0; i < views.length; i++) if (views[i].id() === mark) return views[i];
        return null;
    }

    /** 领域源的机读旁挂：记下半径、纹数、时限与单一类别，供判定、AI 与持续画面读取。 */
    WorldCombat.effect(imprisonMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.radius !== "number" || !isFinite(value.radius) || value.radius < 1) throw new Error("Invalid imprison radius");
        if (typeof value.max !== "number" || !isFinite(value.max) || value.max < 1) throw new Error("Invalid imprison window");
        if (value.category !== imprisonContact && value.category !== imprisonRanged) throw new Error("Invalid imprison category");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    // 领域在时按间隔巡检、并把随身体移动的边界绑在领域源自己的生命周期上：牛奶或 /effect clear 提前关掉领域时，画面随之一同收。
    WorldCombat.effectHandler(imprisonMark, "start", function (effect) { imprisonHold(effect); });
    WorldCombat.effectHandler(imprisonMark, "hold", function (effect) { imprisonHold(effect); });
    WorldCombat.effectHandler(imprisonMark, "end", function (effect) { delete imprisonSpent[effect.id()]; });
    WorldCombat.effectHandler(imprisonMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 封印印记的机读旁挂：记下所属领域源实例与施法者；判定看共享身份加这份链接。 */
    WorldCombat.effect(imprisonBrand, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.caster !== "string" || typeof value.mark !== "number") throw new Error("Invalid imprison brand");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(imprisonBrand, "start", function (effect) { imprisonGuard(effect); });
    WorldCombat.effectHandler(imprisonBrand, "guard", function (effect) { imprisonGuard(effect); });
    WorldCombat.effectHandler(imprisonBrand, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(imprisonBrand, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        // 多个封印者联合落印时，只撤掉自己这一份；仍有别人的印就保留共享身份。
        const remaining = world.effects(victim, imprisonBrand).filter(function (view) { return view.id() !== effect.id(); });
        if (remaining.length === 0) MobEffects.consume(world, victim, imprisonSealed);
    });

    /** 一个战斗者当前实际会用的直接进攻类别集合（含临时层）：native:contact / native:ranged。 */
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

    /** 这份伤害是否属于所选类别的直接进攻：真实已发生的直接攻击，按实际接触与否归类。 */
    function imprisonMatch(category: string, data: any): boolean {
        if (!DamageSemantics.directOffense(data)) return false;
        const contact = DamageSemantics.read(data).contact;
        return (category === imprisonContact) === contact;
    }

    /** 落在某个敌人身上的、属于这名施法者当前领域的印记；旧印记或别的封印者不算。 */
    function imprisonBrandOf(world: CombatWorld, victim: CombatActor, casterRef: string): { view: CombatEffectView; mark: number } | null {
        const views = world.effects(victim, imprisonBrand);
        for (let i = 0; i < views.length; i++) {
            const data = JSON.parse(String(views[i].data()));
            if (String(data.caster) === casterRef) return { view: views[i], mark: Number(data.mark) };
        }
        return null;
    }

    /** 给一个对手落印：挂共享身份与机读链接；首次落下时播一条完整锁纹。返回是否落成。 */
    function imprisonSeal(world: CombatWorld, caster: CombatActor, victim: CombatActor, markId: number): boolean {
        if (!CombatStatus.apply(world, victim, imprisonStatus, imprisonSealed, imprisonBrandTicks, 0)) return false;
        return world.effect(imprisonBrand, victim, JSON.stringify({ caster: String(caster.ref()), mark: markId }), imprisonBrandTicks) > 0;
    }

    /** 领域巡检：领域内每个可见且未消费份额的敌对个体落一条锁纹；返回当前落着的数量。 */
    function imprisonSweep(world: CombatWorld, caster: CombatActor, mark: { radius: number }, markId: number): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        const casterRef = String(caster.ref());
        // visibleOnly=true 用原生视线：隔厚墙的隐藏敌不在名单里，不会被远距离落印。
        const near = world.query(body.position(), mark.radius, true);
        const spent = imprisonSpentOf(markId);
        let hit = 0;
        for (let i = 0; i < near.length; i++) {
            const other = near[i];
            if (String(other.key()) === String(caster.key()) || !world.valid(other) || world.friendly(other)) continue;
            if (spent[String(other.ref())]) continue;
            if (imprisonBrandOf(world, other, casterRef) === null) imprisonSeal(world, caster, other, markId);
            hit++;
        }
        return hit;
    }

    /** 领域在时每 10 刻巡检一次并把边界绑到领域源上；类别与半径都以领域旁挂为准。 */
    function imprisonHold(effect: CombatEffect): void {
        const world = effect.world(), caster = effect.target();
        if (!world.valid(caster)) { effect.end(); return; }
        const body = world.observe(caster);
        if (body === null) { effect.end(); return; }
        const mark = JSON.parse(effect.state());
        const seals = imprisonSweep(world, caster, mark, effect.id());
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_imprison/ring", imprisonScene, 1, body.position(),
            { moment: "hold", target: String(caster.ref()), radius: mark.radius, seals: mark.seals || 0,
                count: seals, category: mark.category,
                contactMotes: mark.category === imprisonContact ? 8 : 0,
                rangedMotes: mark.category === imprisonRanged ? 8 : 0 });
        effect.schedule("hold", "hold", imprisonBrandInterval, "{}");
    }

    /** 印记自检：领域源换了、范围/视线失效或份额已用，就立刻解绑，不靠旧印记继续隔墙锁人。 */
    function imprisonGuard(effect: CombatEffect): void {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const caster = world.actor(String(data.caster));
        if (caster === null || !world.valid(caster)) { effect.end(); return; }
        const markView = imprisonMarkView(world, caster, Number(data.mark));
        if (markView === null) { effect.end(); return; }
        const mark = JSON.parse(String(markView.data()));
        const casterBody = world.observe(caster), victimBody = world.observe(victim);
        if (casterBody === null || victimBody === null) { effect.end(); return; }
        if (casterBody.position().minus(victimBody.position()).length() > mark.radius + 0.6
            || !world.clear(casterBody.position(), victimBody.position())
            || imprisonSpentOf(markView.id())[String(victim.ref())]) { effect.end(); return; }
        effect.remaining(imprisonBrandTicks);
        WorldFeedback.onEffect(world, effect.id(), "world_combat:imprison/brand", "world_combat:move_imprison/brand", 1,
            victimBody.position(), { target: String(victim.ref()), category: mark.category });
        effect.schedule("guard", "guard", 1, "{}");
    }

    /**
     * 敌方额度：统一在 damage_incoming 处理。攻击者带着本领域的一条锁纹、实际攻击者仍在圈内且可见，
     * 且这一击属于所选类别的直接进攻、份额尚未消费时，拒绝这一击并原子标记已消费；同一次攻击后续连击照常。
     * 绝不在 available/commit 封敌，以免它永不尝试、份额永不消费。
     */
    WorldCombat.on("world_combat:move_imprison/incoming", "world_combat:damage_incoming", "", function (event) {
        const world = event.world(), attacker = event.actor();
        if (!world.valid(attacker)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.amount > 0) || data.bypassesInvulnerability) return;
        // 攻击者身上可能挂着多名施法者的印；逐个按各自领域复核。
        const views = world.effects(attacker, imprisonBrand);
        for (let i = 0; i < views.length; i++) {
            const link = JSON.parse(String(views[i].data()));
            const caster = world.actor(String(link.caster));
            if (caster === null || !world.valid(caster) || String(caster.key()) === String(attacker.key())) continue;
            const markView = imprisonMarkView(world, caster, Number(link.mark));
            if (markView === null) continue;
            const mark = JSON.parse(String(markView.data()));
            if (!imprisonMatch(String(mark.category), data)) continue;
            const casterBody = world.observe(caster), attackerBody = world.observe(attacker);
            if (casterBody === null || attackerBody === null) continue;
            // 判定当拍复查 3D 身体距离与视线；离圈或隔墙的敌人可正常攻击。
            if (casterBody.position().minus(attackerBody.position()).length() > mark.radius + 0.6) continue;
            if (!world.clear(casterBody.position(), attackerBody.position())) continue;
            const spent = imprisonSpentOf(markView.id());
            if (spent[String(attacker.ref())]) continue;
            spent[String(attacker.ref())] = true;
            event.reject("imprisoned");
            // 成功拦下当拍破开：撤掉这条锁纹并播锁定碎裂。
            world.operation(views[i].id(), "world_combat:dispel", "{}");
            const kind = mark.category === imprisonContact ? imprisonContact : imprisonRanged;
            WorldFeedback.emit(world, imprisonScene, 1, attackerBody.position(),
                { moment: "break", target: String(attacker.ref()), category: kind }, 22);
            WorldFeedback.text(world, attackerBody.position().plus(WorldCombat.point(0, 1.15, 0)), imprisonBlockText,
                [{ key: "world_combat.move.imprison.kind." + kind, fallback: kind }], 26);
            world.sound("minecraft:block.beacon.deactivate", attackerBody.position(), 12, "{}");
            return;
        }
    });

    // 自方代价：领域期施法者自己也不得主动使用所选类别。对带提交的动作在提交点拦，对没有提交的原生攻击
    // 在命中点拦；这条限制独立只读，不动敌方份额。
    CombatStatus.actions.define({ id: "world_combat:move_imprison/self", apply: function (context) {
        const markView = imprisonMarkOf(context.world, context.actor);
        if (markView === null) return;
        const mark = JSON.parse(String(markView.data()));
        const category = String(mark.category);
        let contact: boolean;
        if (context.phase === "damage" && DamageSemantics.read(context.metadata).attack) {
            contact = DamageSemantics.read(context.metadata).contact;
        } else if (context.move && typeof context.move.id === "function") {
            if (String(context.move.category()) === "status") return;
            contact = !!NativeLoadout.facts(context.move).flags.contact;
        } else return;
        if ((category === imprisonContact) !== contact) return;
        context.blocked["imprisoned-self"] = true;
        context.detail["imprisoned-self"] = { category: category };
    } });

    // 自方代价的可见回执：告诉施法者这是它自己立下的类别限制，不额外减速、不打断移动。
    CombatStatus.rejected.define({ id: "world_combat:move_imprison/self-reject", applies: function (context) {
        return String(context.reason) === "imprisoned-self";
    }, apply: function (context) {
        const world = context.world, actor = context.actor;
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        const details = context.details || {};
        const kind = details.category === imprisonRanged ? imprisonRanged : imprisonContact;
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), imprisonSelfText,
            [{ key: "world_combat.move.imprison.kind." + kind, fallback: kind }], 26);
    } });

    define({
        id: imprisonId,
        cooldownParameter: "recharge",
        name: "封印",
        description: "展开随自己移动的封印领域，选定「接触」或「非接触」中一种直接进攻类别：圈内每个看得见的敌人只有第一条该类攻击会被顶回、锁纹随之破裂，之后照常；领域期你自己也不得主动使用这一类。",
        uses: ["在被近战群围住时各顶回它们第一击", "封住远程对射时对方的第一发", "用自身一类的代价换取一次多人拦截"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 12,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "seal",
        stationary: true,
        defaults: { scope: 1, category: "contact", ai: { maxChase: 14, leaveStation: false } },
        fields: [
            field(pathOf("scope"), "封锁取向", "choice", {
                options: [{ value: 1, label: "固守" }, { value: 0, label: "广布" }],
                help: "固守：领域收拢 ×0.8、时长 ×1.35、冷却 ×1.15，钉住一片久一点。广布：领域铺开 ×1.25、时长 ×0.75、冷却 ×0.9，罩住更多人却撑得更短。"
            }),
            field(pathOf("category"), "封锁类别", "choice", {
                options: [{ value: "contact", label: "接触" }, { value: "ranged", label: "非接触" }],
                help: "接触：顶回圈内敌人第一条近身直接攻击，同时你自己也不得使用近身直接攻击。非接触：顶回第一条远程直接攻击，同时你自己也不得使用远程直接攻击。两类各有自己的空门；状态、持续伤害与环境伤害不受影响。"
            })
        ],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[imprisonId], detail: { values: config } };
            const ranged = read(config, ["category"]) === imprisonRanged;
            return { radius: pokemon ? p(imprisonId, "imprisonRadius", context) : 6, geometry: "area", style: "seal", color: 0x7C6CFF,
                label: ranged ? "封印领域 · 非接触" : "封印领域 · 接触" };
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
        windup: function (action, config, prepare) {
            const actor = action.actor();
            const category = imprisonCategory(config);
            action.present("world_combat:move_imprison:windup", imprisonScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(actor.ref()), category: category,
                    radius: p(imprisonId, "imprisonRadius", action), seals: p(imprisonId, "sealCount", action),
                    scope: read(config, ["scope"]) === 1 ? 1 : 0,
                    contactMotes: category === imprisonContact ? 6 : 0,
                    rangedMotes: category === imprisonRanged ? 6 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const radius = p(imprisonId, "imprisonRadius", action);
            const ticks = Math.max(40, Math.round(p(imprisonId, "imprisonTicks", action)));
            const seals = Math.max(4, Math.round(p(imprisonId, "sealCount", action)));
            const category = imprisonCategory(config);
            // 载体被拒就不创建隐形领域：没有真实领域源就没有任何判定。
            if (MobEffects.apply(world, self, imprisonAura, ticks, 0) === null) { done(action); return; }
            // 同源只维持一场领域：旧领域撤掉，但把敌人已用掉的份额原样带到新领域，重施不刷新账本。
            const stale = world.effects(self, imprisonMark);
            let carried: { [ref: string]: boolean } | null = null;
            for (let i = 0; i < stale.length; i++) {
                carried = imprisonSpent[stale[i].id()] || carried;
                world.operation(stale[i].id(), "world_combat:dispel", "{}");
            }
            const markId = world.effect(imprisonMark, self, JSON.stringify({ radius: radius, max: ticks, seals: seals,
                scope: read(config, ["scope"]) === 1 ? 1 : 0, category: category }), ticks);
            if (carried) imprisonSpent[markId] = carried;
            const affected = imprisonSweep(world, self, { radius: radius }, markId);
            WorldFeedback.emit(world, imprisonScene, 1, body.position(),
                { moment: "seal", target: String(self.ref()), radius: radius,
                    seals: seals, count: affected, category: category,
                    contactMotes: category === imprisonContact ? 10 : 0,
                    rangedMotes: category === imprisonRanged ? 10 : 0 }, 40);
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
        const markView = imprisonMarkOf(world, caster);
        const mark = markView === null ? null : JSON.parse(String(markView.data()));
        const radius = mark === null ? 8 : mark.radius;
        const body = world.observe(caster);
        if (body !== null) {
            const near = world.query(body.position(), radius + 2, false);
            for (let i = 0; i < near.length; i++) {
                if (!world.valid(near[i])) continue;
                const link = imprisonBrandOf(world, near[i], String(caster.ref()));
                if (link !== null) world.operation(link.view.id(), "world_combat:dispel", "{}");
            }
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
