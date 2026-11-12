function validarProduto(nome, preco, quantidade) {
    if (!nome || nome.trim() === '') {
        return { valido: false, erro: 'Nome é obrigatório' };
    }
    if (preco === undefined || preco <= 0) {
        return { valido: false, erro: 'Preço deve ser maior que zero' };
    }
    if (quantidade === undefined || quantidade < 0) {
        return { valido: false, erro: 'Quantidade não pode ser negativa' };
    }
    return { valido: true };
}
module.exports = { validarProduto };
