/**
 * 怨恨 / spite —— 注册与动作。
 *
 * 两幕：
 *   起（windup，提交前）：施法者头顶聚起一团暗紫怨念（`action.present` 预告）。
 *   追（travel，提交后）：一枚缓慢的自导怨念弹扑向目标；它每刻只肯转有限角度，目标绕到掩体后就能甩掉。
 *   咬（bite ／ fizzle）：命中活体的那一刻读它最近一次真正放出的招式——若在记忆窗口内，从那一招里抠走
 *       `ppCut` 点 PP（宝可梦专属的一层，走 CobblemonCombat.pp 的比较写入，只会扣、不会加）；
 *       无论扣到没有，都把共享身份 `world_combat:status/grudge` 的怀恨挂上（脚步变沉、出招变慢，
 *       对宝可梦、原版生物、玩家一视同仁）；没有可扣的招式只会少一次抽 PP，不会白跑。
 *
 * 与同族分开：模仿/写生把招式搬进自己身上，纹理２改写自己的属性；怨恨不改自己，只取走目标手里那一手的存量。
 * 与诡异咒语分开：诡异咒语是带伤害的远程点射顺手抽 3 点；怨恨不造成任何伤害，抽 4 点并留下怀恨。
 */
namespace PokemonSkills {
    const spiteScene = "world_combat:move_spite";
    const SPITE_EFFECT = "world_combat:spite_grudge";
    const spiteBiteText = "world_combat.move.spite.text.bite";
    const spiteMarkText = "world_combat.move.spite.text.mark";
    const spiteFizzleText = "world_combat.move.spite.text.fizzle";

    /** 目标最近一次真正放出的招式，仍在记忆窗口内时返回它。 */
    function spiteMemory(current: CombatAction, target: CombatActor): { id: string; slot: number; key: string } | null {
        if (String(target.domain()) !== "cobblemon") return null;
        const world = current.sense(), state = NativeEffects.read(world, target);
        if (!state.used || world.tick() - (state.usedTick || -1000) > p("spite", "memory", current)) return null;
        const last = NativeEffects.lastMove(world, target);
        return last === null ? null : { id: last.id, slot: last.slot, key: last.key };
    }

    /** 从目标招式表里找到那一手，扣掉 cut 点 PP；返回实际扣掉的点数（0 表示没扣动）。 */
    function spiteCut(world: CombatWorld, target: CombatActor, found: { id: string; slot: number; key: string }, cut: number): number {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return 0;
        const pokemon = CobblemonCombat.pokemon(target);
        let slot = found.slot;
        const keyMatches = (move: CombatPokemonMove | null): boolean => move !== null && String(move.id()) === found.id && (!found.key || String(move.key()) === found.key);
        if (slot < 0 || slot >= pokemon.moveSlots() || !keyMatches(pokemon.move(slot))) {
            slot = -1;
            for (let index = 0; index < pokemon.moveSlots(); index++) {
                if (keyMatches(pokemon.move(index))) { slot = index; break; }
            }
        }
        const move = slot < 0 ? null : pokemon.move(slot);
        if (move === null || String(move.id()) !== found.id) return 0;
        const before = move.pp(), after = Math.max(0, before - cut);
        if (after === before) return 0;
        return CobblemonCombat.pp(world, target, slot, String(move.key()), before, after) ? before - after : 0;
    }

    define({
        id: "spite",
        cooldownParameter: "recharge",
        name: "Spite",
        description: "向刚出过手的目标送出一道怨念：命中时从它最后使用的那一招里抠走 4 点 PP，并让怀恨留在它身上，脚步变沉、出招变慢。",
        uses: ["惩罚刚出手的目标", "拆掉对手赖以为生的招", "拖慢追击者"],
        kind: "enemy",
        range: 12,
        maxRange: 17,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 48,
        style: "grudge",
        defaults: { ai: { maxChase: 14, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("spite", "collisionRadius", pokemon), geometry: "line", style: "grudge", color: 0x5B3FA0, label: "怨念弹道" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spite"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: p("spite", "charge", context),
                recover: p("spite", "afterglow", context),
                cooldown: p("spite", "recharge", context),
                active: 0,
                range: p("spite", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:spite:" + action.id(), spiteScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", shards: p("spite", "shards", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            const targetRef = target === null ? "" : String(target.ref());
            const speed = p("spite", "boltSpeed", action);
            const turn = p("spite", "wispTurn", action);
            const radius = p("spite", "collisionRadius", action);
            const cut = Math.max(1, Math.round(p("spite", "ppCut", action)));
            const shards = Math.max(6, Math.round(p("spite", "shards", action)));
            const grudgeTicks = Math.max(40, Math.round(p("spite", "grudgeTicks", action)));
            sound(action, "minecraft:entity.evoker.cast_spell");

            const appearance: LivingActions.ProjectileAppearance = { sprite: "cobblemon:generic/orb/xsfadeorb", tint: 0x5B3FA0, glow: true, scale: Math.max(0.9, radius / 0.28) };
            if (targetRef) appearance.homing = { target: targetRef, turn: turn, delay: 3, range: action.range() };

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 240, appearance: appearance,
                impact: function (current, hit) {
                    const scope = current.world(), struck = hit.target();
                    if (struck === null || !scope.valid(struck) || scope.friendly(struck)) {
                        WorldFeedback.emit(scope, spiteScene, 1, hit.position(), { moment: "fizzle", shards: shards }, 22);
                        WorldFeedback.text(scope, hit.position(), spiteFizzleText, [], 26);
                        scope.sound("minecraft:block.soul_soil.break", hit.position(), 16, "{}");
                        return;
                    }
                    const ref = String(struck.ref()), point = hit.position();
                    const found = spiteMemory(current, struck);
                    const taken = found === null ? 0 : spiteCut(scope, struck, found, cut);
                    // 怀恨经由共享身份挂上：任何活体都读得到 world_combat:status/grudge。
                    CombatStatus.apply(scope, struck, "grudge", SPITE_EFFECT, grudgeTicks, 0, { unique: true });
                    WorldFeedback.emit(scope, spiteScene, 1, point, {
                        moment: "bite", target: ref, shards: shards, taken: taken,
                        intensity: found === null ? 1 : 1 + Math.min(1, taken / Math.max(1, cut))
                    }, 34);
                    if (taken > 0) {
                        WorldFeedback.text(scope, point, spiteBiteText, [taken], 34);
                        scope.sound("minecraft:block.amethyst_block.break", point, 16, "{}");
                    } else {
                        WorldFeedback.text(scope, point, spiteMarkText, [], 32);
                        scope.sound("minecraft:entity.evoker.cast_spell", point, 16, "{}");
                    }
                }
            }, done);
            WorldFeedback.emit(world, spiteScene, 1, action.origin(), { moment: "travel", projectile: flight, target: targetRef,
                shards: shards, flow: Math.round(16 + speed * 14) }, 60);
        }
    });
}
