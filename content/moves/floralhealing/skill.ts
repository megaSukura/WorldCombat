/**
 * 花疗 / Floral Healing —— 执行组织。
 *
 * 核心念头：撒一把花瓣到伙伴脚下，分两次绽开——第一朵当场补一半，第二朵稍后按受益人**当时的**青草场地状态再开，
 *   站在青草场地收第二口更足。两朵加起来仍在原总上限之内，是「当场兑现的两拍」，不是一条会赶路的波。
 *
 * 出手：共享节奏。windup（提交前）只播预告——手边先拢起一小束花；准备可被打断，不花代价。
 * 第一朵（提交后）：花瓣沿施法者到伙伴的连线撒过去，落地即补第一半；绽放与文本读实际回复量。
 * 第二朵（`bloomDelay` 之后）：重新取得受益人——还活着、仍是友方就在它**当前所在位置**开第二朵，
 *   花簇跟着人走而不是留在地面；此刻带 shared 青草身份就按 `grassBoost` 开大。对象失效则取消剩余（fade）。
 *
 * 反制：第二朵的短延迟就是余地——对手可以在这口之间把伙伴带走、或把它推离青草场地，第二口就变小或落空。
 * 与同族分开：治愈波动是一圈从自己身上出发、要赶一段远路的波；花疗是当场在伙伴脚边分两朵绽开。
 */
namespace PokemonSkills {
    const floralhealingScene = "world_combat:move_floralhealing";
    const floralhealingTextBloom = "world_combat.move.floralhealing.text.bloom";
    const floralhealingTextGrass = "world_combat.move.floralhealing.text.grass";

    function floralhealingAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function floralhealingHeal(world: CombatWorld, target: CombatActor, fraction: number, cause: string): number {
        var body = world.observe(target);
        if (!body) return 0;
        var missing = body.maxHealth() - body.health();
        if (missing <= 0) return 0;
        var amount = Math.min(missing, body.maxHealth() * Math.max(0, Math.min(1, fraction)));
        if (amount <= 0) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon" && world.valid(target)) {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            healed = world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        if (healed > 0 && after) feedback(world, target, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    define({
        id: floralhealingId, name: "花疗",
        description: "撒一路花瓣到选定友方身上，在它脚边分两朵绽开：第一朵当场补一半，第二朵稍后按它**当时**的青草场地状态再补一口，两朵合计约回复其最大生命的一半、站在青草场地上更高。只救别人，不救自己；对象中途失效则取消剩余。",
        uses: ["远远地给伙伴补一口", "在青草场地上把第二朵抬得更足", "用两拍补给缓冲伙伴的掉血节奏"],
        kind: "friend", range: 5, maxRange: 9, prepare: 9, active: 0, recover: 8, cooldown: 130, style: "floral",
        maximumTicks: 240,
        defaults: { bouquet: false },
        fields: [flag("bouquet", "繁花")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[floralhealingId], detail: { values: config } };
            return { radius: p(floralhealingId, "bloomRadius", context), geometry: "point", style: "floral", color: 0xE89AC0,
                label: config && config.bouquet === true ? "繁花疗" : "花疗" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[floralhealingId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const bouquet = !!(config && config.bouquet);
            return {
                prepare: Math.max(4, Math.round(p(floralhealingId, "tempo", context))),
                recover: Math.max(3, Math.round(p(floralhealingId, "settle", context))),
                cooldown: Math.round(p(floralhealingId, "cooldown", context) * (bouquet ? 1.1 : 0.95)),
                active: 0,
                range: p(floralhealingId, "reach", context)
            };
        },
        ready: function (action) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "invalid-target";
            if (!action.sense().friendly(target)) return "invalid-target";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("floralhealing:windup", floralhealingScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", petals: p(floralhealingId, "petals", action) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const body = world.observe(self);
            if (!body || target === null || !world.valid(target) || String(target.ref()) === String(self.ref())) { done(action); return; }
            const mate = world.observe(target);
            if (mate === null) { done(action); return; }
            const total = Math.max(0, Math.min(1, p(floralhealingId, "heal", action)));
            const grassBoost = Math.max(0, Math.min(1, p(floralhealingId, "grassBoost", action)));
            const first = total * 0.5, secondBase = total * 0.5;
            const delay = Math.max(6, Math.round(p(floralhealingId, "bloomDelay", action)));
            const radius = Math.max(0.4, p(floralhealingId, "bloomRadius", action));
            const petals = Math.max(8, Math.round(p(floralhealingId, "petals", action)));
            const budget = Math.max(0, Math.round(p(floralhealingId, "flowers", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / 0.8));
            const ref = String(target.ref());
            const origin = body.position();

            function bloom(access: CombatWorld, actor: CombatActor, dose: number, share: number, grass: boolean): void {
                const view = access.observe(actor);
                const at = view === null ? origin : view.position();
                const dosePetals = dose === 2 ? Math.round(petals * (grass ? 1.5 : 1.2)) : petals;
                access.sound("minecraft:block.flowering_azalea.place", at, 14, "{}");
                WorldFeedback.emit(access, floralhealingScene, 1, at,
                    { moment: "bloom", target: String(actor.ref()), petals: dosePetals,
                        healDust: Math.max(10, Math.round(dosePetals * (0.4 + share))),
                        gold: grass ? Math.max(8, Math.round(dosePetals * 0.5)) : 0, radius: radius, scale: scale }, 34);
                if (dose === 2 && budget > 0)
                    WorldFeedback.emit(access, floralhealingScene, 1, at,
                        { moment: "residue", target: String(actor.ref()), flowers: budget, radius: radius }, 30);
            }

            sound(action, "minecraft:block.flowering_azalea.place");            WorldFeedback.emit(world, floralhealingScene, 1, origin,
                { moment: "scatter", target: ref, path: [[origin.x(), origin.y() + 0.55, origin.z()], ref], petals: petals }, 30);

            const before1 = mate.health();
            floralhealingHeal(world, target, first, "floralhealing");
            const after1 = world.observe(target);
            const gained1 = after1 ? Math.max(0, after1.health() - before1) : 0;
            const share1 = mate.maxHealth() > 0 ? gained1 / mate.maxHealth() : 0;
            bloom(world, target, 1, share1, false);
            WorldFeedback.text(world, floralhealingAbove(mate.position()), floralhealingTextBloom, [Math.round(gained1 * 10) / 10], 30);

            action.after(delay, function (current: CombatAction) {
                const access = current.world();
                const now = access.actor(ref);
                const live = now === null ? null : access.observe(now);
                if (now === null || live === null || !access.valid(now) || !access.friendly(now) || String(now.ref()) === String(self.ref())) {
                    WorldFeedback.emit(access, floralhealingScene, 1, current.origin(),
                        { moment: "fade", radius: radius, scale: scale }, 22);
                    done(current);
                    return;
                }
                const grass = CombatStatus.has(access, now, "grassyterrain");
                const second = secondBase + (grass ? grassBoost : 0);
                const before2 = live.health();
                floralhealingHeal(access, now, second, "floralhealing");
                const after2 = access.observe(now);
                const gained2 = after2 ? Math.max(0, after2.health() - before2) : 0;
                const share2 = live.maxHealth() > 0 ? gained2 / live.maxHealth() : 0;
                bloom(access, now, 2, share2, grass);
                const shown = after2 === null ? live.position() : after2.position();
                WorldFeedback.text(access, floralhealingAbove(shown), grass ? floralhealingTextGrass : floralhealingTextBloom, [Math.round(gained2 * 10) / 10], 30);
                done(current);
            });
        }
    });
}
