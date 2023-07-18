describe('Clip', () => {
  it('should play clip', function () {
    cy.visit('/');
    cy.get('app-clips-list > .grid a:first').click();
    cy.wait(3000);
    cy.get('.video-js').click();
    cy.wait(3000);
    cy.get('.video-js').click();
    cy.get('.vjs-play-progress').invoke('width').should('gte', 0)
  });
})
