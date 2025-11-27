rptQL para S- Tabela EssniaisscriptpanelHiitrxtensõesnecesas
CREATE EXTENSION IF NOT EXISTS "uuid-sp";

--=============================================
-- TABELA DE USUÁRIOS esseia prnticação-- =============================================

 DEFAULT uuid_generate_v4()assword_ash VARCHAR(255), -- Mantid para compatibilidade, mas ão usado com SupabasAuth
    phone =============================================
-- ABELADECONFIGURAÇÕESDOUSUÁRIO-- =============================================

uuid_etev4TNUL,FORGN));--=============================================--=============================================
uuid_etev4OTUL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- =============================================ABELADEINSTÂNCIASHATSPP
--=============================================
uuid_etev4NULLFOG)IQur_i--muá=â);
--=============================================--ÍCC-- =============================================_evolutioninstcestatevolution_instcestat
-- ============================================= TRIGGER PARAUPDATED_A
-- =============================================

-- Função
-- Triggers--=============================================SEGURANÇA
-- =============================================

-- HbilitRLStablldvolution_instnce
-- Políticas de segurança para users
CREPOICY"Usrs can ew w profle" ON ur
  FRST SNG (auth.uid() = id)
CREPOICY"Users n udte owprofile" Ousers
    FRUPDATSNG (auth.uid() = id)ae_settngsttings_ettings
   user_
sttings_ettings
   user_nsrt
   SERTWITH CHECK -- Políticas para leads
led" ON leds
   FOR SELECT USING (auth.uid() = use_id);

CREATE POLICY "Uss can insrt ow ladleads
    FOR INSERT WITH CHECK (ath.uid() = uid);

CREATE POLICY "Uers cn udat ow lad"ON leads
    UPDTEdelet
   DEETE
-- Políticas para evolution_instances
   SEECTnsrtinstceevolution_instce
   INERT WTH CHECKCRETEPOLICY"Uss canpate wnintancs" ONevolution_insta
    FOR UPDATE USING (auth.uid() = ue_d;
Userdelet onintancevoltion_intanc
   DE(auth.uid) = user_id);

-- =============================================--TRIGGERPARACRIARRGROAUMATICANT
--===========================================congrções automaticamne
    -- Inserir na tabela users, phoneNovo ,
        NEW.raw_user_meta_data->>'phone'fs--nr cofiraçõeparãottig quedisa qundo novousuáos egsr

-- =============================================
-- USUÁRIO ADMIN PADRÃO (opcional)
-- =============================================

-- Inserir usuário admin (email: admin@prospectplus.com)
-- Este usuário precisará ser criado manualmente ou via signup
INSERT INTO users (
    id, name, email, role, is_active, email_verified
) VALUES (
    uuid_generate_v4(),
    'Administrador',
    'admin@prospectplus.com',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- =============================================
-- VIEWS ÚTEIS
-- =============================================

-- View para leads do usuário atual
CREATE VIEW v_my_leads AS
SELECT * FROM leads WHERE user_id = auth.uid();

-- View para instâncias do usuário atual
CREATE VIEW v_my_instances AS
SELECT * FROM evolution_instances WHERE user_id = auth.uid();

-- View para configurações do usuário atual
CREATE VIEW v_my_settings AS
SELECT * FROM user_settings WHERE user_id = auth.uid();

-- =============================================
-- COMENTÁRIOS
-- =============================================

/*
Este script cria:

1. ✅ Tabelas essenciais com UUIDs
2. ✅ Relacionamentos e chaves estrangeiras
3. ✅ Índices para performance
4. ✅ Triggers automáticos para updated_at
5. ✅ Row Level Security (RLS) para isolamento de dados
6. ✅ Trigger automático para criar usuário na tabela users
7. ✅ Views convenientes para o usuário atual

Como executar:
1. Copie este script
2. Cole no painel SQL do Supabase
3. Execute o script completo
4. Teste o registro de novo usuário

O trigger `handle_new_user()` garante que quando um usuário
se registra na autenticação do Supabase, automaticamente
é criado um registro na tabela users com as configurações.
*/