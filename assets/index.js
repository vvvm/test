$(function () {
    /**
     * Generate instagram request url
     * @param {String} path - request url path part
     * @param {Object} obj - GET parameters as key:value
     * @return {string}
     */
    function generateInstUrl(path, obj) {
        var url = 'https://api.instagram.com/v1/' + path + '?';

        for (var key in obj) {
            url += '&' + key + '=' + obj[key];
        }

        return url;
    }

    /**
     * Get instagram data (return data and next_max_id if exist)
     * @param {String} path - request url path part
     * @param {Object} obj - GET parameters as key:value
     * @return {*}
     */
    function getInstData(path, obj) {
        var d = $.Deferred(),
            images = [],

            /**
             * Instagram limit data count for one request, this is method allows get unlimit data
             */
            getInstDataMore = function (path, obj) {
                $.ajax({
                    url: generateInstUrl(path, obj),
                    type: 'GET',
                    dataType: "jsonp"
                }).done(function (data) {
                    if (data.data.length) {
                        images = images.concat(data.data);

                        if (data.data.length < count) {
                            count -= data.data.length;

                            if (data.pagination.next_max_id) {
                                getInstDataMore(path, $.extend(obj, {
                                    count: count,
                                    max_id: data.pagination.next_max_id
                                }));
                            } else {
                                d.resolve(images);
                            }
                        } else {
                            if (data.pagination.next_max_id) {
                                d.resolve(images, data.pagination.next_max_id);
                            } else {
                                d.resolve(images);
                            }
                        }
                    } else {
                        d.resolve();
                    }
                }).fail(function () {
                    d.reject();
                });
            },
            count = obj.count;

        getInstDataMore(path, obj);

        return d.promise();
    }


    /**
     * Get item img block
     * @param {Object} img_obj - image object from instagram
     * @param {Number} spacing
     * @return {string} - HTML string
     */
    function getItemImgBlock(img_obj, spacing) {
        return [
            '<div class="inst-card slide" style="padding: ' + spacing + 'px">',
            '   <a class="inst-card__link" href="' + img_obj.link + '" target="_blank" style="background-image: url(' + img_obj.images.standard_resolution.url + ')"></a>',
            '   <a class="inst-card__info" href="' + img_obj.link + '" target="_blank">',
            '       <div class="inst-card__info-inner">',
            '           <span class="inst-card__likes"><span class="mbri-like"></span>&nbsp;' + img_obj.likes.count + '</span>&nbsp;&nbsp;',
            '           <span class="inst-card__comments"><span class="mbri-cust-feedback"></span>&nbsp;' + img_obj.comments.count + '</span>',
            '       </div>',
            '   </a>',
            '</div>'
        ].join('\n');
    }

    $(document).on('add.cards change.cards', function (e) {
        if ($(e.target).hasClass('mbr-instagram-feed')) { // if it's instagram component
            var $mbrInstagramFeed = $(e.target),
                inst = {
                    $loader: $([
                        '<div class="inst__loader-wrapper">',
                        '   <div class="inst__loader">',
                        '      <span></span>',
                        '      <span></span>',
                        '      <span></span>',
                        '   </div>',
                        '</div>'
                    ].join('\n')),

                    $content: $mbrInstagramFeed.find('.inst__content'),

                    $moreButton: $mbrInstagramFeed.find('.inst__more a'),

                    showLoader: function () {
                        if (!$('.inst__loader-wrapper').length) {
                            $mbrInstagramFeed.append(this.$loader);
                        }
                    },

                    hideLoader: function () {
                        this.$loader.remove();
                    }
                },

                // component params
                token = $mbrInstagramFeed.attr('data-token'),
                perRowGrid = $mbrInstagramFeed.attr('data-per-row-grid'),
                rows = $mbrInstagramFeed.attr('data-rows'),
                perRowSlider = $mbrInstagramFeed.attr('data-per-row-slider'),
                spacing = $mbrInstagramFeed.attr('data-spacing'),
                fullWidth = $mbrInstagramFeed.attr('data-full-width'),

                path = 'users/self/media/recent',

                layoutType;

            /**
             * Ajax loading fail handler
             */
            function failHandler() {
                inst.$content.empty();

                inst.$content.append([ //append error message
                    '<div class="inst__error">Error download Instagram data!</div>'
                ].join('\n'));

                inst.hideLoader();
            }

            if (token) { //if component has token
                if (perRowGrid) {
                    layoutType = 'grid';
                } else if (perRowSlider) {
                    layoutType = 'slider';
                }

                if (layoutType) {
                    // toogle full width
                    if (fullWidth) {
                        $mbrInstagramFeed.find('.container_toggle').addClass('container-fluid').removeClass('container');
                    } else {
                        $mbrInstagramFeed.find('.container_toggle').addClass('container').removeClass('container-fluid');
                    }

                    // init view by layout type
                    switch (layoutType) {
                        case 'grid':
                            inst.showLoader();

                            getInstData(path, {
                                access_token: token,
                                count: perRowGrid * rows
                            }).then(function(data, next_max_id) {
                                /**
                                 * Change card size
                                 */
                                function changeCardSize() {
                                    var $instCard = inst.$content.find('.inst-card'),
                                        width;

                                    if ($(window).width() < 500) {
                                        width = 100;
                                    } else if ($(window).width() < 800) {
                                        width = 50;
                                    } else {
                                        width = 100 / perRowGrid;
                                    }

                                    $instCard.css({
                                        "width": width + '%',
                                        "float": "left"
                                    });

                                    $instCard.css({ // adaptive block height
                                        "height": inst.$content.find('.inst-card').outerWidth()
                                    });
                                }

                                /**
                                 * Filling container with images
                                 */
                                function fillingCards(data, next_max_id) {
                                    for (var i = 0, length = data.length; i < length; i++) { //append items
                                        inst.$content.find('.inst__images').append(getItemImgBlock(data[i], spacing));
                                    }

                                    $(window).on('resize', function(e) {
                                        changeCardSize();
                                    });

                                    changeCardSize();

                                    if (next_max_id) {
                                        inst.$moreButton.attr('data-max-id', next_max_id);
                                    } else {
                                        inst.$moreButton.remove();
                                    }
                                }

                                inst.hideLoader();

                                inst.$content.empty(); // clear block from old data

                                inst.$content.append('<div class="inst__images clearfix"></div>'); // append images block

                                fillingCards(data, next_max_id);

                                inst.$moreButton.on('click', function(e) {
                                    var maxId = $(this).attr('data-max-id');

                                    if (!window.mbrAppCore) { // it's very bad but i don't know another
                                        e.preventDefault();

                                        inst.showLoader();

                                        getInstData(path, {
                                            access_token: token,
                                            count: perRowGrid * rows,
                                            max_id: maxId
                                        }).done(function(data, next_max_id) {
                                            fillingCards(data, next_max_id);

                                            inst.hideLoader();
                                        }).fail(failHandler);
                                    }
                                });
                            }).fail(failHandler);
                            break;


                        case 'slider':
                            inst.showLoader();

                            getInstData(path, {
                                access_token: token,
                                count: perRowSlider * 3
                            }).then(function(data, next_max_id) {
                                var maxId = next_max_id ? next_max_id : null;

                                inst.hideLoader();

                                inst.$content.empty(); // clear block from old data

                                inst.$content.append('<div class="inst__images"></div>'); // append images block

                                for (var i = 0, length = data.length; i < length; i++) { // apend items
                                    inst.$content.find('.inst__images').append(getItemImgBlock(data[i], spacing));
                                }

                                var $slider = inst.$content.find('.inst__images');

                                $slider.on('init, setPosition', function (slick) {
                                    var $instCard = $(this).find('.inst-card'),
                                        width = $instCard.css('width');

                                    $instCard.css('height', width); // adaptive block height

                                    return true;
                                });

                                $slider.slick({ // init slider
                                    infinite: false,
                                    slidesToShow: Number.parseInt(perRowSlider),
                                    slidesToScroll: Number.parseInt(perRowSlider),
                                    arrows: true,
                                    slide: '.slide',
                                    responsive: [
                                        {
                                            breakpoint: 800,
                                            settings: {
                                                slidesToShow: 2,
                                                slidesToScroll: 2,
                                                arrows: false
                                            }
                                        },
                                        {
                                            breakpoint: 500,
                                            settings: {
                                                slidesToShow: 1,
                                                slidesToScroll: 1,
                                                arrows: false
                                            }
                                        }
                                    ]
                                });

                                $slider.on('afterChange', function (event, slick, currentSlide) {
                                    var slideCount = slick.slideCount,
                                        nextSlide = currentSlide + +perRowSlider; // next slide number

                                    if (nextSlide >= slideCount) { // next slide number more than slide count
                                        if (maxId) {
                                            inst.showLoader();

                                            getInstData(path, {
                                                access_token: token,
                                                count: perRowSlider * 2,
                                                max_id: maxId
                                            }).then(function (data, next_max_id) {
                                                var slides = [];

                                                inst.hideLoader();

                                                for (var i = 0, length = data.length; i < length; i++) {
                                                    slides.push(getItemImgBlock(data[i], spacing));
                                                }

                                                $slider.slick('slickAdd', slides.join('\n'));
                                                $slider.find('.slick-arrow').remove();
                                                $slider.slick('reinit');

                                                maxId = next_max_id ? next_max_id : null;
                                            });
                                        }
                                    }
                                });
                            }).fail(failHandler);

                            break;
                    }
                }
            }
        }
    });
});